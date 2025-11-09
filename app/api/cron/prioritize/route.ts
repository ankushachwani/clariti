import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { prioritizeTask } from '@/lib/ai/cohere';

// This endpoint can be called by a cron job (e.g., Vercel Cron, external service)
// Note: Vercel Cron jobs don't send authorization headers, so we'll skip auth for now
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret if provided
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Only check auth if CRON_SECRET is set and auth header is provided
    if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Starting task prioritization...');

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    let totalTasksProcessed = 0;
    let usersProcessed = 0;

    for (const user of users) {
      try {
        // Get incomplete tasks with upcoming deadlines (next 14 days)
        const now = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

        const tasks = await prisma.task.findMany({
          where: {
            userId: user.id,
            completed: false,
            dueDate: {
              gte: now,
              lte: twoWeeksFromNow,
            },
          },
        });

        // Prioritize each task
        for (const task of tasks) {
          try {
            const result = await prioritizeTask(task);

            await prisma.task.update({
              where: { id: task.id },
              data: {
                priority: result.priority,
                urgencyScore: result.urgencyScore,
                aiSummary: result.reasoning,
                aiProcessed: true,
              },
            });

            totalTasksProcessed++;
          } catch (taskError) {
            console.error(`[CRON] Error prioritizing task ${task.id}:`, taskError);
          }
        }

        usersProcessed++;
      } catch (userError) {
        console.error(`[CRON] Error processing user ${user.email}:`, userError);
      }
    }

    console.log(
      `[CRON] Completed! Processed ${totalTasksProcessed} tasks for ${usersProcessed} users`
    );

    return NextResponse.json({
      success: true,
      message: `Prioritized ${totalTasksProcessed} tasks for ${usersProcessed} users`,
      totalTasksProcessed,
      usersProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error in cron job:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    );
  }
}
