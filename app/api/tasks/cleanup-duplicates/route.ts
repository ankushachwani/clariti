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

    // Get all tasks for this user from Canvas
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        source: 'canvas',
      },
      orderBy: {
        createdAt: 'asc', // Keep oldest tasks
      },
    });

    // Group tasks by sourceId (handling both old and new formats)
    const taskGroups = new Map<string, any[]>();
    
    for (const task of tasks) {
      // Normalize sourceId to handle old format without prefix
      let normalizedId = task.sourceId;
      
      // If sourceId doesn't have a prefix, try to determine it from category
      if (!task.sourceId.includes('_')) {
        if (task.category === 'assignment') {
          normalizedId = `assignment_${task.sourceId}`;
        } else if (task.category === 'quiz') {
          normalizedId = `quiz_${task.sourceId}`;
        } else if (task.category === 'announcement') {
          normalizedId = `announcement_${task.sourceId}`;
        } else if (task.category === 'discussion') {
          normalizedId = `discussion_${task.sourceId}`;
        }
      }
      
      if (!taskGroups.has(normalizedId)) {
        taskGroups.set(normalizedId, []);
      }
      taskGroups.get(normalizedId)!.push(task);
    }

    let duplicatesRemoved = 0;

    // For each group, keep the first task and delete the rest
    for (const [sourceId, groupTasks] of taskGroups) {
      if (groupTasks.length > 1) {
        // Keep the first task (oldest), update its sourceId if needed
        const taskToKeep = groupTasks[0];
        
        // Update the kept task to have the correct sourceId format
        if (!taskToKeep.sourceId.includes('_')) {
          await prisma.task.update({
            where: { id: taskToKeep.id },
            data: { sourceId: sourceId },
          });
        }

        // Delete all duplicates
        for (let i = 1; i < groupTasks.length; i++) {
          await prisma.task.delete({
            where: { id: groupTasks[i].id },
          });
          duplicatesRemoved++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${duplicatesRemoved} duplicate tasks`,
      duplicatesRemoved,
    });
  } catch (error) {
    console.error('Cleanup duplicates error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicates' },
      { status: 500 }
    );
  }
}
