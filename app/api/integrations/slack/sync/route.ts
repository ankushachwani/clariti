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

    // Fetch user's messages and reminders
    try {
      // Get recent messages from channels the user is in (past 7 days)
      const userInfoResponse = await fetch('https://slack.com/api/users.conversations', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (userInfoResponse.ok) {
        const channelsData = await userInfoResponse.json();
        
        if (channelsData.ok && channelsData.channels) {
          const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
          
          // Process up to 5 channels to avoid rate limits
          for (const channel of channelsData.channels.slice(0, 5)) {
            try {
              // Get messages from this channel
              const messagesResponse = await fetch(
                `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${sevenDaysAgo}&limit=50`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (!messagesResponse.ok) continue;

              const messagesData = await messagesResponse.json();
              
              if (messagesData.ok && messagesData.messages) {
                for (const message of messagesData.messages) {
                  // Skip messages without text or from bots
                  if (!message.text || message.bot_id) continue;

                  const text = message.text;
                  const timestamp = message.ts ? new Date(parseFloat(message.ts) * 1000) : new Date();
                  
                  // Use AI to analyze the message
                  const aiAnalysis = await analyzeSlackMessageWithAI(text, timestamp, channel.name);
                  
                  if (!aiAnalysis.isImportant || !aiAnalysis.dueDate) continue;

                  const sourceId = `slack_msg_${message.ts}`;

                  await prisma.task.create({
                    data: {
                      userId: user.id,
                      source: 'slack',
                      sourceId: sourceId,
                      title: aiAnalysis.title,
                      description: aiAnalysis.description,
                      dueDate: aiAnalysis.dueDate,
                      completed: false,
                      category: 'email',
                      sourceUrl: undefined,
                      metadata: {
                        channel: channel.name,
                        type: 'message',
                        aiDetermined: true,
                        originalText: text.substring(0, 200),
                      },
                    },
                  });

                  totalItems++;
                }
              }
            } catch (channelError) {
              console.error(`Error processing channel ${channel.id}:`, channelError);
            }
          }
        }
      }

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
            const aiAnalysis = await analyzeSlackMessageWithAI(text, timestamp, 'starred');
            
            if (!aiAnalysis.isImportant || !aiAnalysis.dueDate) continue;

            const sourceId = `slack_star_${item.message.ts || item.date_create}`;

            await prisma.task.create({
              data: {
                userId: user.id,
                source: 'slack',
                sourceId: sourceId,
                title: aiAnalysis.title,
                description: aiAnalysis.description,
                dueDate: aiAnalysis.dueDate,
                completed: false,
                category: 'email',
                sourceUrl: item.message.permalink || undefined,
                metadata: {
                  channel: item.channel,
                  type: 'starred',
                  aiDetermined: true,
                  originalText: text.substring(0, 200),
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
  timestamp: Date,
  channelName?: string
): Promise<{ isImportant: boolean; dueDate: Date | null; title: string; description: string }> {
  try {
    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    });

    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `Today's date is ${currentDate}.

Analyze this Slack message${channelName ? ` from #${channelName}` : ''} and determine if it's an ACTIONABLE TASK.

Message: ${text.substring(0, 500)}

CRITICAL: Only mark isImportant=true if this requires someone to DO SOMETHING with a deadline.

Mark isImportant=FALSE for:
- Casual conversations, chit-chat
- Social messages, memes, jokes
- FYI updates with no action needed
- General announcements without deadlines
- "Thanks", "Got it", acknowledgments
- Questions without deadlines

Mark isImportant=TRUE only for:
- Task assignments with deadlines (e.g., "Can you finish X by Friday?")
- Project deadlines mentioned
- Meeting reminders with specific times to attend
- Code review requests with due dates
- Action items from meetings

If isImportant=true, rewrite into a clear task title and extract the deadline.

Respond with ONLY a JSON object (no markdown):
{
  "isImportant": true/false,
  "title": "Clear task title" or null,
  "description": "What needs to be done" or null,
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
      title: analysis.title || text.substring(0, 100),
      description: analysis.description || text.substring(0, 300),
    };
  } catch (error) {
    console.error('AI analysis error for Slack:', error);
    // Fallback
    return {
      isImportant: false,
      dueDate: null,
      title: text.substring(0, 100),
      description: text.substring(0, 300),
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
