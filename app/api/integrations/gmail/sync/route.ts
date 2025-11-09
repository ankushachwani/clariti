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
      console.log('Google account not found or no access token');
      return NextResponse.json({ error: 'Google not connected' }, { status: 400 });
    }

    console.log('Google account found, access token exists');

    // Check if token needs refresh
    let accessToken = account.access_token;
    if (account.expires_at && account.expires_at * 1000 < Date.now()) {
      console.log('Access token expired, refreshing...');
      
      if (!account.refresh_token) {
        console.error('No refresh token available');
        return NextResponse.json({ error: 'Google token expired, please reconnect' }, { status: 400 });
      }

      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const tokens = await tokenResponse.json();
        
        if (tokens.access_token) {
          accessToken = tokens.access_token;
          
          // Update account with new token
          await prisma.account.update({
            where: { id: account.id },
            data: {
              access_token: tokens.access_token,
              expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
            },
          });
          
          console.log('Token refreshed successfully');
        } else {
          console.error('Failed to refresh token:', tokens);
          return NextResponse.json({ error: 'Failed to refresh Google token' }, { status: 400 });
        }
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        return NextResponse.json({ error: 'Failed to refresh Google token' }, { status: 400 });
      }
    }

    // Delete all existing Gmail tasks to avoid duplicates
    await prisma.task.deleteMany({
      where: {
        userId: user.id,
        source: 'gmail',
      },
    });

    let totalTasks = 0;
    let totalEvents = 0;

    console.log('Starting Gmail sync...');

    // Search for all emails from the past 2 days (not just academic)
    const searchQueries = [
      'is:important',
      'is:starred',
      'has:attachment',
      '', // All emails from past 2 days
    ];
    
    const processedMessageIds = new Set<string>();
    let totalMessagesFound = 0;
    let filteredOut = 0;
    
    for (const query of searchQueries) {
      try {
        const searchQuery = query ? `${query} newer_than:2d` : 'newer_than:2d';
        const searchResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=50`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!searchResponse.ok) {
          console.log(`Failed to search Gmail for: ${query}`, await searchResponse.text());
          continue;
        }

        const searchData = await searchResponse.json();
        const messages = searchData.messages || [];
        
        console.log(`Query "${query}" found ${messages.length} messages`);
        totalMessagesFound += messages.length;

        for (const message of messages) {
          // Skip if already processed
          if (processedMessageIds.has(message.id)) continue;
          processedMessageIds.add(message.id);

          try {
            // Get full message details
            const messageResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              }
            );

            if (!messageResponse.ok) continue;

            const messageData = await messageResponse.json();
            
            // Extract headers
            const headers = messageData.payload.headers || [];
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find((h: any) => h.name === 'From')?.value || '';
            const dateHeader = headers.find((h: any) => h.name === 'Date')?.value;
            
            const receivedDate = dateHeader ? new Date(dateHeader) : new Date(parseInt(messageData.internalDate));
            
            // Get email body
            let emailBody = '';
            if (messageData.payload.body?.data) {
              emailBody = decodeBase64(messageData.payload.body.data);
            } else if (messageData.payload.parts) {
              // Handle multipart emails
              for (const part of messageData.payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                  emailBody += decodeBase64(part.body.data);
                } else if (part.mimeType === 'text/html' && part.body?.data && !emailBody) {
                  emailBody += stripHtml(decodeBase64(part.body.data));
                }
              }
            }

            const snippet = messageData.snippet || emailBody.substring(0, 500);
            const fullContent = subject + ' ' + emailBody;

            // Use AI to determine if email is important and extract due date
            const aiAnalysis = await analyzeEmailWithAI(subject, snippet, fullContent, receivedDate);
            
            if (!aiAnalysis.isImportant) {
              filteredOut++;
              console.log(`Filtered out email: "${subject}" (AI determined not important)`);
              continue;
            }

            const dueDate = aiAnalysis.dueDate || null;
            const category = aiAnalysis.category || 'email';

            // Use the AI-generated title and description (cleaned up and concise)
            const taskData = {
              title: aiAnalysis.title || `📧 ${subject}`,
              description: aiAnalysis.description || snippet,
              dueDate: dueDate,
              completed: false,
              category: category,
              sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
              metadata: {
                from: from,
                receivedDate: receivedDate.toISOString(),
                aiDetermined: true,
                originalSubject: subject,
                type: 'email',
              },
            };

            await prisma.task.create({
              data: {
                userId: user.id,
                source: 'gmail',
                sourceId: message.id,
                ...taskData,
              },
            });

            console.log(`Created task from email: "${subject}"`);
            totalTasks++;

            // If it's a meeting/interview with a specific time, also create a calendar event
            if (category === 'meeting' && dueDate) {
              const eventTime = extractMeetingTime(fullContent, dueDate);
              
              if (eventTime) {
                const eventId = `gmail_meeting_${message.id}`;
                
                await prisma.task.create({
                  data: {
                    userId: user.id,
                    title: `📅 ${subject}`,
                    description: `Meeting from email: ${snippet}`,
                    dueDate: eventTime,
                    completed: false,
                    category: 'meeting',
                    source: 'gmail',
                    sourceId: eventId,
                    sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
                    metadata: {
                      from: from,
                      linkedToEmail: message.id,
                      type: 'meeting',
                    },
                  },
                });
                totalEvents++;
              }
            }

          } catch (msgError) {
            console.error(`Error processing message ${message.id}:`, msgError);
          }
        }
      } catch (queryError) {
        console.error(`Error searching for ${query}:`, queryError);
      }
    }

    console.log(`Gmail sync complete: ${totalMessagesFound} total messages, ${filteredOut} filtered out, ${totalTasks} tasks created`);

    return NextResponse.json({
      success: true,
      message: `Synced ${totalTasks} emails and created ${totalEvents} calendar events from Gmail (${totalMessagesFound} messages scanned, ${filteredOut} filtered)`,
      taskCount: totalTasks,
      eventCount: totalEvents,
      messagesScanned: totalMessagesFound,
      filtered: filteredOut,
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Gmail data' },
      { status: 500 }
    );
  }
}

// Use AI to analyze if email is important and extract due date
async function analyzeEmailWithAI(
  subject: string,
  snippet: string,
  fullContent: string,
  receivedDate: Date
): Promise<{ isImportant: boolean; dueDate: Date | null; category: string; title: string; description: string }> {
  try {
    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    });

    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `Today's date is ${currentDate}.

Analyze this email and respond with ONLY a JSON object (no markdown, no extra text):

Subject: ${subject}
Content: ${snippet.substring(0, 500)}

Tasks:
1. Determine if this is important and actionable (work/school related, not personal spam, birthdays, statements unless action needed)
2. If important, rewrite the title to be clear and concise (remove "Re:", "Fwd:", make it actionable)
3. If important, create a short description (1-2 sentences summarizing what needs to be done)
4. Extract any due date from natural language
5. Categorize appropriately

Filter OUT:
- Birthdays, personal celebrations
- Credit card statements (unless payment due)
- Marketing/promotional emails
- Social media notifications
- Newsletters

Keep and rewrite:
- Assignments, homework, projects
- Meetings, interviews
- Quizzes, exams
- Important deadlines
- Action required items

JSON format:
{
  "isImportant": true/false,
  "title": "Clear, actionable title" or null,
  "description": "What needs to be done" or null,
  "dueDate": "YYYY-MM-DD" or null,
  "category": "assignment/meeting/quiz/announcement/email"
}`;

    const response = await cohere.chat({
      model: 'command-r',
      message: prompt,
      temperature: 0.3,
    });

    const responseText = response.text.trim();
    
    // Extract JSON from response (remove markdown code blocks if present)
    let jsonText = responseText;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    
    const analysis = JSON.parse(jsonText);
    
    // Parse the due date if provided
    let dueDate: Date | null = null;
    if (analysis.dueDate) {
      dueDate = new Date(analysis.dueDate);
      if (isNaN(dueDate.getTime())) {
        dueDate = null;
      }
    }
    
    return {
      isImportant: analysis.isImportant === true,
      dueDate: dueDate,
      category: analysis.category || 'email',
      title: analysis.title || `📧 ${subject}`,
      description: analysis.description || snippet,
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    // Fallback to basic filtering if AI fails
    const hasKeywords = /deadline|due|submit|meeting|interview|appointment|reminder|urgent|important|assignment|homework|project|quiz|exam|test/i.test(subject + ' ' + snippet);
    return {
      isImportant: hasKeywords,
      dueDate: extractDueDate(fullContent, receivedDate),
      category: 'email',
      title: `📧 ${subject}`,
      description: snippet,
    };
  }
}

function decodeBase64(data: string): string {
  try {
    // Gmail uses URL-safe base64
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    return '';
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractDueDate(text: string, baseDate: Date): Date | null {
  // Enhanced date extraction patterns
  const patterns = [
    // "due on November 15" or "due Nov 15"
    /due\s+(?:on|by)?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
    // "deadline: 11/15/2024" or "deadline 11/15"
    /deadline[:\s]+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    // "submit by November 15" 
    /submit\s+by\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
    // "due date: Nov 15"
    /due\s+date[:\s]+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
    // "by November 15th"
    /by\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
    // "on 11/15" or "on November 15"
    /on\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let dateStr = match[1];
        
        // Handle date formats
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          let year = parts[2] ? parseInt(parts[2]) : baseDate.getFullYear();
          
          // Handle 2-digit years
          if (year < 100) year += 2000;
          
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        } else {
          // Try parsing text dates
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            // If no year specified, use current year or next year if date has passed
            if (!dateStr.match(/\d{4}/)) {
              const currentYear = baseDate.getFullYear();
              parsedDate.setFullYear(currentYear);
              
              // If date is in the past, assume next year
              if (parsedDate < baseDate) {
                parsedDate.setFullYear(currentYear + 1);
              }
            }
            return parsedDate;
          }
        }
      } catch (e) {
        continue;
      }
    }
  }

  return null;
}

function extractMeetingTime(text: string, dueDate: Date): Date | null {
  // Look for time patterns like "at 3pm", "at 15:00", "2:30 PM"
  const timePatterns = [
    /(?:at|@)\s*(\d{1,2}):?(\d{2})?\s*(am|pm)/i,
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,
    /(?:at|@)\s*(\d{1,2})\s*(am|pm)/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const meridiem = match[3]?.toLowerCase();

        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;

        const meetingDate = new Date(dueDate);
        meetingDate.setHours(hours, minutes, 0, 0);

        return meetingDate;
      } catch (e) {
        continue;
      }
    }
  }

  return null;
}
