import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import { generateWorkRoadmap } from '@/lib/ai/cohere';

export async function GET(request: NextRequest) {
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

    // Get top priority tasks (incomplete, with upcoming deadlines, sorted by priority)
    const now = new Date();
    const priorityTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        completed: false,
        dueDate: {
          gte: now,
        },
      },
      orderBy: [
        { priority: 'desc' },
        { urgencyScore: 'desc' },
        { dueDate: 'asc' },
      ],
      take: 10, // Top 10 priority tasks for dashboard
    });

    // Generate AI roadmap
    const roadmap = await generateWorkRoadmap(priorityTasks.slice(0, 5));

    return NextResponse.json({ 
      success: true,
      tasks: priorityTasks,
      roadmap,
      count: priorityTasks.length,
    });
  } catch (error) {
    console.error('Error fetching priority tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch priority tasks' },
      { status: 500 }
    );
  }
}
