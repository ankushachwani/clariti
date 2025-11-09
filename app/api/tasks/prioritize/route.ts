import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import { prioritizeTask } from '@/lib/ai/cohere';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all incomplete tasks with upcoming deadlines (next 14 days)
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
      orderBy: {
        dueDate: 'asc',
      },
    });

    if (tasks.length === 0) {
      return NextResponse.json({ 
        message: 'No tasks to prioritize',
        prioritizedCount: 0 
      });
    }

    // Prioritize each task using Cohere AI
    let prioritizedCount = 0;
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
        
        prioritizedCount++;
      } catch (error) {
        console.error(`Error prioritizing task ${task.id}:`, error);
        // Continue with other tasks even if one fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Prioritized ${prioritizedCount} tasks`,
      prioritizedCount,
      totalTasks: tasks.length,
    });
  } catch (error) {
    console.error('Error prioritizing tasks:', error);
    return NextResponse.json(
      { error: 'Failed to prioritize tasks' },
      { status: 500 }
    );
  }
}
