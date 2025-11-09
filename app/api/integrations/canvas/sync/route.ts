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

    // Get Canvas integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider: 'canvas',
        isConnected: true,
      },
    });

    if (!integration || !integration.accessToken) {
      return NextResponse.json({ error: 'Canvas not connected' }, { status: 400 });
    }

    const canvasUrl = (integration.metadata as any)?.canvasUrl || process.env.CANVAS_API_URL;
    const accessToken = integration.accessToken;

    // Fetch all courses
    const coursesResponse = await fetch(`${canvasUrl}/api/v1/courses?enrollment_state=active`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!coursesResponse.ok) {
      throw new Error('Failed to fetch Canvas courses');
    }

    const courses = await coursesResponse.json();
    let totalTasks = 0;

    // For each course, fetch assignments
    for (const course of courses) {
      try {
        const assignmentsResponse = await fetch(
          `${canvasUrl}/api/v1/courses/${course.id}/assignments`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!assignmentsResponse.ok) continue;

        const assignments = await assignmentsResponse.json();

        // Create/update tasks for each assignment
        for (const assignment of assignments) {
          const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;

          // Check if task already exists
          const existingTask = await prisma.task.findFirst({
            where: {
              userId: user.id,
              source: 'canvas',
              sourceId: assignment.id.toString(),
            },
          });

          if (existingTask) {
            // Update existing task
            await prisma.task.update({
              where: { id: existingTask.id },
              data: {
                title: assignment.name,
                description: assignment.description || `Assignment for ${course.name}`,
                dueDate: dueDate,
                completed: assignment.has_submitted_submissions || false,
                course: course.name,
                sourceUrl: assignment.html_url,
                metadata: {
                  points: assignment.points_possible,
                  submissionTypes: assignment.submission_types,
                },
              },
            });
          } else {
            // Create new task
            await prisma.task.create({
              data: {
                userId: user.id,
                title: assignment.name,
                description: assignment.description || `Assignment for ${course.name}`,
                dueDate: dueDate,
                completed: assignment.has_submitted_submissions || false,
                category: 'assignment',
                course: course.name,
                source: 'canvas',
                sourceId: assignment.id.toString(),
                sourceUrl: assignment.html_url,
                metadata: {
                  points: assignment.points_possible,
                  submissionTypes: assignment.submission_types,
                },
              },
            });
          }

          totalTasks++;
        }
      } catch (courseError) {
        console.error(`Error syncing course ${course.id}:`, courseError);
      }
    }

    // Update last synced time
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${totalTasks} assignments from Canvas`,
      taskCount: totalTasks,
    });
  } catch (error) {
    console.error('Canvas sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Canvas data' },
      { status: 500 }
    );
  }
}
