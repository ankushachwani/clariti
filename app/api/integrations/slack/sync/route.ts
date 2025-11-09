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

    // Get Slack integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider: 'slack',
        isConnected: true,
      },
    });

    if (!integration || !integration.accessToken) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 });
    }

    // Delete all existing Slack tasks to avoid duplicates
    await prisma.task.deleteMany({
      where: {
        userId: user.id,
        source: 'slack',
      },
    });

    const accessToken = integration.accessToken;
    let totalItems = 0;

    // Fetch user's saved/starred messages and reminders
    try {
      // Get starred items
      const starsResponse = await fetch('https://slack.com/api/stars.list', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (starsResponse.ok) {
        const starsData = await starsResponse.json();
        
        if (starsData.ok && starsData.items) {
          for (const item of starsData.items) {
            // Only process messages with text
            if (!item.message?.text) continue;

            const text = item.message.text;
            const timestamp = item.message.ts ? new Date(parseFloat(item.message.ts) * 1000) : new Date();
            
            // Use AI to analyze the message
            const aiAnalysis = await analyzeSlackMessageWithAI(text, timestamp);
            
            if (!aiAnalysis.isImportant || !aiAnalysis.dueDate) continue;

            const sourceId = `slack_star_${item.message.ts || item.date_create}`;

            await prisma.task.create({
              data: {
                userId: user.id,
                source: 'slack',
                sourceId: sourceId,
                title: `⭐ ${text.substring(0, 100)}`,
                description: text,
                dueDate: aiAnalysis.dueDate,
                completed: false,
                category: 'email', // Using email category for Slack messages
                sourceUrl: item.message.permalink || undefined,
                metadata: {
                  channel: item.channel,
                  type: 'starred',
                  aiDetermined: true,
                },
              },
            });

            totalItems++;
          }
        }
      }

      // Get reminders
      const remindersResponse = await fetch('https://slack.com/api/reminders.list', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json();
        
        if (remindersData.ok && remindersData.reminders) {
          for (const reminder of remindersData.reminders) {
            // Skip completed reminders
            if (reminder.complete) continue;

            const dueDate = reminder.time ? new Date(reminder.time * 1000) : null;
            
            // Only include reminders with due dates
            if (!dueDate) continue;

            await prisma.task.create({
              data: {
                userId: user.id,
                source: 'slack',
                sourceId: `slack_reminder_${reminder.id}`,
                title: `🔔 ${reminder.text}`,
                description: reminder.text,
                dueDate: dueDate,
                completed: false,
                category: 'email',
                metadata: {
                  reminderId: reminder.id,
                  type: 'reminder',
                },
              },
            });

            totalItems++;
          }
        }
      }

      // Update last synced time
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: `Synced ${totalItems} items from Slack`,
        itemCount: totalItems,
      });
    } catch (error) {
      console.error('Slack API error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Slack sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Slack data' },
      { status: 500 }
    );
  }
}

// Use AI to analyze Slack message and extract due date
async function analyzeSlackMessageWithAI(
  text: string,
  timestamp: Date
): Promise<{ isImportant: boolean; dueDate: Date | null }> {
  try {
    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    });

    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `Today's date is ${currentDate}.

Analyze this Slack message and respond with ONLY a JSON object (no markdown, no extra text):

Message: ${text.substring(0, 500)}

Determine:
1. Is this message important enough to track? (has action item, deadline, or something to follow up on)
2. If there's a due date mentioned (like "tomorrow", "next week", "Friday", etc.), calculate the actual date

JSON format:
{
  "isImportant": true/false,
  "dueDate": "YYYY-MM-DD" or null
}`;

    const response = await cohere.chat({
      model: 'command-r',
      message: prompt,
      temperature: 0.3,
    });

    const responseText = response.text.trim();
    
    // Extract JSON from response
    let jsonText = responseText;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    
    const analysis = JSON.parse(jsonText);
    
    // Parse the due date
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
    };
  } catch (error) {
    console.error('AI analysis error for Slack:', error);
    // Fallback
    return {
      isImportant: false,
      dueDate: null,
    };
  }
}

// Extract potential due dates from Slack message text (fallback)
function extractDueDateFromText(text: string, referenceDate: Date): Date | null {
  const lowerText = text.toLowerCase();
  
  // Look for explicit date patterns
  const datePatterns = [
    /due\s+(?:by|on)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /deadline[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /by\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // Look for relative dates
  if (/(tomorrow|tmrw)/i.test(lowerText)) {
    const tomorrow = new Date(referenceDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  if (/today/i.test(lowerText)) {
    return new Date(referenceDate);
  }

  if (/next\s+week/i.test(lowerText)) {
    const nextWeek = new Date(referenceDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  // Look for month names with day numbers
  const monthMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/i);
  if (monthMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = monthNames.findIndex(m => monthMatch[1].toLowerCase().startsWith(m));
    const day = parseInt(monthMatch[2]);
    
    if (month >= 0 && day >= 1 && day <= 31) {
      const date = new Date(referenceDate.getFullYear(), month, day);
      
      // If the date is in the past, assume next year
      if (date < referenceDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      
      return date;
    }
  }

  return null;
}
