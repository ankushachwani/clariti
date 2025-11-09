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

    let totalTasks = 0;

    // Search for emails with keywords like "assignment", "deadline", "due", "project"
    const keywords = ['assignment', 'deadline', 'due date', 'project due', 'homework'];
    
    for (const keyword of keywords) {
      try {
        const searchResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(keyword + ' after:' + getDateDaysAgo(30))}&maxResults=20`,
          {
            headers: {
              'Authorization': `Bearer ${account.access_token}`,
            },
          }
        );

        if (!searchResponse.ok) continue;

        const searchData = await searchResponse.json();
        const messages = searchData.messages || [];

        for (const message of messages) {
          try {
            // Get full message details
            const messageResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${account.access_token}`,
                },
              }
            );

            if (!messageResponse.ok) continue;

            const messageData = await messageResponse.json();
            
            // Extract subject and snippet
            const subject = messageData.payload.headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const snippet = messageData.snippet || '';
            const date = new Date(parseInt(messageData.internalDate));

            // Try to extract due date from content
            const dueDate = extractDueDate(subject + ' ' + snippet) || new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);

            // Check if task already exists
            const existingTask = await prisma.task.findFirst({
              where: {
                userId: user.id,
                source: 'gmail',
                sourceId: message.id,
              },
            });

            if (!existingTask) {
              await prisma.task.create({
                data: {
                  userId: user.id,
                  title: subject,
                  description: snippet,
                  dueDate: dueDate,
                  completed: false,
                  category: 'email',
                  source: 'gmail',
                  sourceId: message.id,
                  sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
                },
              });

              totalTasks++;
            }
          } catch (msgError) {
            console.error(`Error processing message ${message.id}:`, msgError);
          }
        }
      } catch (keywordError) {
        console.error(`Error searching for ${keyword}:`, keywordError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${totalTasks} emails from Gmail`,
      taskCount: totalTasks,
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Gmail data' },
      { status: 500 }
    );
  }
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0].replace(/-/g, '/');
}

function extractDueDate(text: string): Date | null {
  // Look for patterns like "due on Nov 15", "deadline: 11/15", etc.
  const patterns = [
    /due\s+(?:on|by)?\s*(\w+\s+\d{1,2})/i,
    /deadline[:\s]+(\d{1,2}\/\d{1,2})/i,
    /submit\s+by\s+(\w+\s+\d{1,2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const dateStr = match[1];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      } catch (e) {
        continue;
      }
    }
  }

  return null;
}
