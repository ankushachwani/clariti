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
    let messagesScanned = 0;
    let messagesFiltered = 0;

    console.log('Starting Slack sync...');

    // Track processed message IDs to avoid duplicates
    const processedMessageIds = new Set<string>();

    // Fetch user's messages and reminders
    try {
      // 1. Search for user's recent messages (now that we have search:read scope!)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

      const searchResponse = await fetch(
        `https://slack.com/api/search.messages?query=from:me after:${dateStr}&count=100&sort=timestamp&sort_dir=desc`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        
        if (searchData.ok && searchData.messages?.matches) {
          messagesScanned += searchData.messages.matches.length;
          
          for (const match of searchData.messages.matches) {
            const text = match.text;
            const timestamp = match.ts ? new Date(parseFloat(match.ts) * 1000) : new Date();
            const messageId = `slack_search_${match.ts}_${match.channel?.id}`;
            
            // Skip if already processed
            if (processedMessageIds.has(messageId)) continue;
            processedMessageIds.add(messageId);
            
            // Use AI to analyze the message
            const aiAnalysis = await analyzeSlackMessageWithAI(text, timestamp, match.channel?.name);
            
            if (!aiAnalysis.isImportant) {
              console.log(`Filtered out Slack message: "${text.substring(0, 50)}..." (not important)`);
              messagesFiltered++;
              continue;
            }

            await prisma.task.create({
              data: {
                userId: user.id,
                source: 'slack',
                sourceId: messageId,
                title: aiAnalysis.title,
                description: aiAnalysis.description,
                dueDate: aiAnalysis.dueDate,
                completed: false,
                category: 'email',
                sourceUrl: match.permalink || undefined,
                metadata: {
                  channel: match.channel?.name,
                  channelId: match.channel?.id,
                  type: 'search',
                  aiDetermined: true,
                  originalText: text.substring(0, 200),
                },
              },
            });

            totalItems++;
          }
        } else if (!searchData.ok) {
          console.error('Slack search API error:', searchData.error);
        }
      }

      // 2. Get starred items (these are messages the user explicitly marked as important)
      const starsResponse = await fetch('https://slack.com/api/stars.list?limit=100', {
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
            const messageId = `slack_star_${item.message.ts || item.date_create}`;
            
            // Skip if already processed (might be in search results too)
            if (processedMessageIds.has(messageId)) continue;
            processedMessageIds.add(messageId);
            
            messagesScanned++;
            
            // Use AI to analyze the message
            const aiAnalysis = await analyzeSlackMessageWithAI(text, timestamp, 'starred');
            
            if (!aiAnalysis.isImportant) {
              console.log(`Filtered out starred Slack message: "${text.substring(0, 50)}..." (not important)`);
              messagesFiltered++;
              continue;
            }

            await prisma.task.create({
              data: {
                userId: user.id,
                source: 'slack',
                sourceId: messageId,
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

      console.log(`Slack sync complete: ${messagesScanned} messages scanned, ${messagesFiltered} filtered out, ${totalItems} tasks created`);

      return NextResponse.json({
        success: true,
        message: `Synced ${totalItems} items from Slack (${messagesScanned} messages scanned, ${messagesFiltered} filtered)`,
        itemCount: totalItems,
        messagesScanned,
        messagesFiltered,
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

Analyze this Slack message${channelName ? ` from #${channelName}` : ''} and determine if it's IMPORTANT for work/school.

Message: ${text.substring(0, 500)}

Mark isImportant=TRUE for:
- Task assignments (even without explicit deadline)
- Project discussions and action items
- Meeting reminders and scheduling
- Code review requests
- Important questions that need responses
- Work/school related discussions
- Blockers or issues raised
- Requests for help or collaboration
- Decision-making threads

Mark isImportant=FALSE for:
- Casual chit-chat, social messages
- Memes, jokes, off-topic
- Simple acknowledgments ("thanks", "got it", "ok")
- General FYI with no action or discussion needed
- Bot messages
- Automated notifications

Try to extract due date if mentioned (e.g., "by Friday", "tomorrow", "next week"), but it's OPTIONAL.

Rewrite title to be clear and concise.

Respond with ONLY a JSON object (no markdown):
{
  "isImportant": true/false,
  "title": "Clear task/discussion title" or null,
  "description": "What this is about" or null,
  "dueDate": "YYYY-MM-DD" or null
}`;

    const response = await cohere.chat({
      model: 'command-r7b-12-2024',
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
