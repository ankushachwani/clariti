import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendDailyDigest } from '@/lib/email/mailer';

export const dynamic = 'force-dynamic';

/**
 * Daily Digest Cron Job
 * Sends daily email digest to all users with emailNotifications enabled
 * 
 * Should be called once per day (e.g., 8 AM) via Vercel Cron
 * URL: /api/cron/daily-digest
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-digest",
 *     "schedule": "0 8 * * *"
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

    // Get all users with email notifications enabled
    const users = await prisma.user.findMany({
      where: {
        settings: {
          emailNotifications: true,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        settings: true,
      },
    });

    console.log(`[CRON] Found ${users.length} users with email notifications enabled`);

    let successCount = 0;
    let errorCount = 0;

    // Send digest to each user
    for (const user of users) {
      try {
        if (!user.email) {
          console.log(`[CRON] Skipping user ${user.id}: no email`);
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
          continue;
        }

        // Send email
        await sendDailyDigest(user.email, user.name || 'there', tasks);
        
        successCount++;
        console.log(`[CRON] ✓ Sent digest to ${user.email}`);
      } catch (userError) {
        errorCount++;
        console.error(`[CRON] Error sending digest to ${user.email}:`, userError);
      }
    }

    console.log(`[CRON] Daily digest job complete: ${successCount} sent, ${errorCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} digests (${errorCount} failed)`,
      usersProcessed: users.length,
      successCount,
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
