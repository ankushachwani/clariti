import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import { CohereClient } from 'cohere-ai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get Google account with access token
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'google',
      },
    });

    if (!account || !account.access_token) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    // Fetch calendar events
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${futureDate.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      throw new Error('Failed to fetch calendar events');
    }

    const calendarData = await calendarResponse.json();
    const events = calendarData.items || [];
    let totalTasks = 0;

    for (const event of events) {
      try {
        // Skip all-day events without specific times
        if (!event.start?.dateTime) continue;

        const startTime = new Date(event.start.dateTime);
        const title = event.summary || 'Untitled Event';
        const description = event.description || '';

        // Hard filter: Immediately reject obvious personal events
        const lowerTitle = title.toLowerCase();
        const lowerDesc = description.toLowerCase();
        
        // Check for birthday patterns
        const isBirthday = 
          lowerTitle.includes('birthday') ||
          lowerTitle.includes('bday') ||
          lowerTitle.includes('b-day') ||
          lowerTitle.includes("'s bday") ||
          lowerTitle.includes("'s birthday") ||
          lowerTitle.match(/\bb\s?day\b/i) ||
          lowerDesc.includes('birthday') ||
          lowerDesc.includes('bday');
          
        if (
          isBirthday ||
          lowerTitle.includes('anniversary') ||
          lowerTitle.includes('party') ||
          lowerTitle.includes('celebration') ||
          lowerTitle.includes('wedding') ||
          lowerTitle.includes('shower')
        ) {
          console.log(`Hard filtered calendar event: "${title}" (obvious personal event)`);
          continue;
        }

        // Use AI to filter and rewrite calendar events
        const aiAnalysis = await analyzeCalendarEventWithAI(title, description);
        
        if (!aiAnalysis.isImportant) {
          console.log(`Filtered out personal calendar event: "${title}"`);
          continue;
        }

        // Check if task already exists
        const existingTask = await prisma.task.findFirst({
          where: {
            userId: user.id,
            source: 'google_calendar',
            sourceId: event.id,
          },
        });

        if (existingTask) {
          // Update existing task with AI-generated title/description
          await prisma.task.update({
            where: { id: existingTask.id },
            data: {
              title: aiAnalysis.title,
              description: aiAnalysis.description,
              dueDate: startTime,
              sourceUrl: event.htmlLink,
              metadata: {
                location: event.location,
                attendees: event.attendees?.length || 0,
                originalTitle: title,
              },
            },
          });
        } else {
          // Create new task with AI-generated title/description
          await prisma.task.create({
            data: {
              userId: user.id,
              title: aiAnalysis.title,
              description: aiAnalysis.description,
              dueDate: startTime,
              completed: false,
              category: 'meeting',
              source: 'google_calendar',
              sourceId: event.id,
              sourceUrl: event.htmlLink,
              metadata: {
                location: event.location,
                attendees: event.attendees?.length || 0,
                originalTitle: title,
              },
            },
          });
          totalTasks++;
        }
      } catch (eventError) {
        console.error(`Error processing event ${event.id}:`, eventError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${totalTasks} events from Google Calendar`,
      taskCount: totalTasks,
    });
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Google Calendar data' },
      { status: 500 }
    );
  }
}

// Use AI to determine if calendar event is work/school related and rewrite title/description
async function analyzeCalendarEventWithAI(
  title: string,
  description: string
): Promise<{ isImportant: boolean; title: string; description: string }> {
  try {
    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    });

    const prompt = `Analyze this calendar event and determine if it requires ACTION or is just FYI.

Title: ${title}
Description: ${description.substring(0, 200)}

CRITICAL: Only mark isImportant=true if this is something the user must ATTEND or PREPARE FOR.

Mark isImportant=FALSE for:
- Birthdays, celebrations, parties (e.g., "Brady's Bday", "Birthday party")
- Personal social events
- Reminders without action needed
- FYI calendar blocks
- Holidays, personal time off
- Generic reminders

Mark isImportant=TRUE only for:
- Classes, lectures you must attend
- Meetings, interviews you're required to join
- Exams, tests, quizzes
- Office hours, presentations
- Work meetings, client calls
- Study sessions, group projects
- Events requiring preparation or attendance

If isImportant=true, rewrite the title to be clear and actionable.

Respond with ONLY a JSON object (no markdown):
{
  "isImportant": true/false,
  "title": "Clear meeting title" or null,
  "description": "What to prepare or bring" or null
}`;

    const response = await cohere.chat({
      model: 'command-light',
      message: prompt,
      temperature: 0.3,
    });

    const responseText = response.text.trim();
    let jsonText = responseText;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    
    const analysis = JSON.parse(jsonText);
    return {
      isImportant: analysis.isImportant === true,
      title: analysis.title || `📅 ${title}`,
      description: analysis.description || description || `Calendar event: ${title}`,
    };
  } catch (error) {
    console.error('AI analysis error for calendar:', error);
    // Fallback: filter out obvious personal events
    const lowerTitle = title.toLowerCase();
    if (
      lowerTitle.includes('birthday') ||
      lowerTitle.includes('bday') ||
      lowerTitle.includes("'s birthday")
    ) {
      return { isImportant: false, title: title, description: description };
    }
    return { isImportant: true, title: `📅 ${title}`, description: description || `Calendar event: ${title}` };
  }
}

// Legacy function - keeping for backwards compatibility
async function isCalendarEventWorkRelated(title: string, description: string): Promise<boolean> {
  try {
    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    });

    const prompt = `Analyze this calendar event and determine if it's work or school related.

Title: ${title}
Description: ${description.substring(0, 200)}

Filter OUT these personal events:
- Birthdays
- Personal celebrations
- Social gatherings
- Personal appointments (haircut, doctor for personal reasons, etc.)
- Holidays
- Personal reminders

Keep these work/school events:
- Classes
- Lectures
- Meetings
- Interviews
- Office hours
- Study groups
- Work appointments
- Academic deadlines

Respond with ONLY a JSON object (no markdown):
{
  "isWorkRelated": true/false
}`;

    const response = await cohere.chat({
      model: 'command-light',
      message: prompt,
      temperature: 0.3,
    });

    const responseText = response.text.trim();
    let jsonText = responseText;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    
    const analysis = JSON.parse(jsonText);
    return analysis.isWorkRelated === true;
  } catch (error) {
    console.error('AI analysis error for calendar:', error);
    // Fallback: filter out obvious personal events
    const lowerTitle = title.toLowerCase();
    if (
      lowerTitle.includes('birthday') ||
      lowerTitle.includes('bday') ||
      lowerTitle.includes("'s birthday")
    ) {
      return false;
    }
    return true; // Default to including if AI fails
  }
}
