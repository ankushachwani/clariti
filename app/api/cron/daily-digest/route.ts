import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendDailyDigest } from '@/lib/email/mailer';

export const dynamic = 'force-dynamic';

/**
 * Daily Digest Cron Job
 * Sends daily email digest to all users with emailNotifications enabled
 * 
 * Should be called every hour via Vercel Cron, checks each user's preferred time
 * URL: /api/cron/daily-digest
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-digest",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Starting daily digest job...');

    // Get current hour in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinutes = now.getUTCMinutes();

    console.log(`[CRON] Current UTC time: ${currentHour}:${currentMinutes.toString().padStart(2, '0')}`);

    // Get all users with email notifications and daily brief enabled
    const users = await prisma.user.findMany({
      where: {
        settings: {
          emailNotifications: true,
          dailyBrief: true,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        settings: {
          select: {
            dailyBriefTime: true,
          },
        },
      },
    });

    console.log(`[CRON] Found ${users.length} users with daily brief enabled`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Send digest to each user whose time matches
    for (const user of users) {
      try {
        if (!user.email) {
          console.log(`[CRON] Skipping user ${user.id}: no email`);
          skippedCount++;
          continue;
        }

        // Get user's preferred time (default: 08:00)
        const preferredTime = user.settings?.dailyBriefTime || '08:00';
        const [prefHour, prefMinute] = preferredTime.split(':').map(Number);

        // Convert user's local time to UTC based on their timezone
        // For simplicity, we'll use the time as-is and assume it's in their local timezone
        // A more robust solution would use a timezone library
        
        // Check if it's time to send (within the current hour)
        // We run this hourly, so we check if the preferred hour matches current hour
        const userTimezone = user.timezone || 'America/New_York';
        
        // Calculate user's current local hour
        const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        const userLocalHour = userLocalTime.getHours();

        console.log(`[CRON] User ${user.email}: Preferred time ${preferredTime}, Local hour: ${userLocalHour}, Target hour: ${prefHour}`);

        // Send if the current local hour matches their preferred hour
        if (userLocalHour !== prefHour) {
          skippedCount++;
          continue;
        }

        // Get user's priority tasks
        const tasks = await prisma.task.findMany({
          where: {
            userId: user.id,
            completed: false,
          },
          orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' },
          ],
          take: 10, // Top 10 tasks
        });

        if (tasks.length === 0) {
          console.log(`[CRON] Skipping user ${user.email}: no tasks`);
          skippedCount++;
          continue;
        }

        // Send email
        await sendDailyDigest(user.email, user.name || 'there', tasks);
        
        successCount++;
        console.log(`[CRON] ✓ Sent digest to ${user.email} at their preferred time (${preferredTime})`);
      } catch (userError) {
        errorCount++;
        console.error(`[CRON] Error sending digest to ${user.email}:`, userError);
      }
    }

    console.log(`[CRON] Daily digest job complete: ${successCount} sent, ${skippedCount} skipped (wrong time), ${errorCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} digests (${skippedCount} skipped, ${errorCount} failed)`,
      usersChecked: users.length,
      successCount,
      skippedCount,
      errorCount,
    });
  } catch (error) {
    console.error('[CRON] Daily digest job error:', error);
    return NextResponse.json(
      { error: 'Failed to send daily digests' },
      { status: 500 }
    );
  }
}
