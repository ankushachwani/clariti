import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';

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
      return NextResponse.json({ error: 'Google not connected' }, { status: 400 });
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

    // Enhanced search queries for academic/work-related emails
    const searchQueries = [
      'assignment OR homework OR project',
      'deadline OR "due date" OR "due by"',
      'exam OR quiz OR test',
      'presentation OR submit OR submission',
      'meeting OR interview OR appointment',
      'reminder OR action required',
      'grade OR feedback OR review',
    ];
    
    const processedMessageIds = new Set<string>();
    
    for (const query of searchQueries) {
      try {
        const searchResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query + ' newer_than:2d')}&maxResults=30`,
          {
            headers: {
              'Authorization': `Bearer ${account.access_token}`,
            },
          }
        );

        if (!searchResponse.ok) {
          console.log(`Failed to search Gmail for: ${query}`);
          continue;
        }

        const searchData = await searchResponse.json();
        const messages = searchData.messages || [];

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
                  'Authorization': `Bearer ${account.access_token}`,
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

            // Check if email is important (has deadline/action items)
            const hasDeadline = /deadline|due\s+(date|by|on)|submit\s+by|turn\s+in|hand\s+in/i.test(fullContent);
            const hasActionItem = /assignment|homework|project|quiz|exam|test|meeting|interview|presentation/i.test(fullContent);
            const hasUrgency = /urgent|asap|important|action\s+required|reminder/i.test(fullContent);

            // Only create tasks for emails with deadlines or important action items
            if (!hasDeadline && !hasActionItem && !hasUrgency) continue;

            // Extract due date from content
            const extractedDate = extractDueDate(fullContent, receivedDate);
            const dueDate = extractedDate || null;

            // Determine category
            let category = 'email';
            if (/meeting|interview|appointment/i.test(fullContent)) {
              category = 'meeting';
            } else if (/exam|quiz|test/i.test(fullContent)) {
              category = 'quiz';
            } else if (/assignment|homework|project/i.test(fullContent)) {
              category = 'assignment';
            }

            const taskData = {
              title: `📧 ${subject}`,
              description: snippet,
              dueDate: dueDate,
              completed: false,
              category: category,
              sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
              metadata: {
                from: from,
                receivedDate: receivedDate.toISOString(),
                hasDeadline: hasDeadline,
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

    return NextResponse.json({
      success: true,
      message: `Synced ${totalTasks} emails and created ${totalEvents} calendar events from Gmail`,
      taskCount: totalTasks,
      eventCount: totalEvents,
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Gmail data' },
      { status: 500 }
    );
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
