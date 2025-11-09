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

        // Check if task already exists
        const existingTask = await prisma.task.findFirst({
          where: {
            userId: user.id,
            source: 'google_calendar',
            sourceId: event.id,
          },
        });

        if (existingTask) {
          // Update existing task
          await prisma.task.update({
            where: { id: existingTask.id },
            data: {
              title: title,
              description: event.description || `Calendar event: ${title}`,
              dueDate: startTime,
              sourceUrl: event.htmlLink,
            },
          });
        } else {
          // Create new task
          await prisma.task.create({
            data: {
              userId: user.id,
              title: title,
              description: event.description || `Calendar event: ${title}`,
              dueDate: startTime,
              completed: false,
              category: 'meeting',
              source: 'google_calendar',
              sourceId: event.id,
              sourceUrl: event.htmlLink,
              metadata: {
                location: event.location,
                attendees: event.attendees?.length || 0,
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
