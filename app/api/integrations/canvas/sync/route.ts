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
    let totalItems = 0;

    // For each course, fetch multiple types of content
    for (const course of courses) {
      try {
        // 1. ASSIGNMENTS
        const assignmentsResponse = await fetch(
          `${canvasUrl}/api/v1/courses/${course.id}/assignments`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (assignmentsResponse.ok) {
          const assignments = await assignmentsResponse.json();

          for (const assignment of assignments) {
            const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;

            const existingTask = await prisma.task.findFirst({
              where: {
                userId: user.id,
                source: 'canvas',
                sourceId: `assignment_${assignment.id}`,
              },
            });

            const taskData = {
              title: assignment.name,
              description: assignment.description || `Assignment for ${course.name}`,
              dueDate: dueDate,
              completed: assignment.has_submitted_submissions || false,
              category: 'assignment',
              course: course.name,
              sourceUrl: assignment.html_url,
              metadata: {
                points: assignment.points_possible,
                submissionTypes: assignment.submission_types,
                type: 'assignment',
              },
            };

            if (existingTask) {
              await prisma.task.update({
                where: { id: existingTask.id },
                data: taskData,
              });
            } else {
              await prisma.task.create({
                data: {
                  userId: user.id,
                  source: 'canvas',
                  sourceId: `assignment_${assignment.id}`,
                  ...taskData,
                },
              });
            }

            totalItems++;
          }
        }

        // 2. ANNOUNCEMENTS
        const announcementsResponse = await fetch(
          `${canvasUrl}/api/v1/courses/${course.id}/discussion_topics?only_announcements=true`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (announcementsResponse.ok) {
          const announcements = await announcementsResponse.json();

          // Only get recent announcements (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          for (const announcement of announcements) {
            const postedDate = new Date(announcement.posted_at || announcement.created_at);
            
            if (postedDate < thirtyDaysAgo) continue;

            const existingTask = await prisma.task.findFirst({
              where: {
                userId: user.id,
                source: 'canvas',
                sourceId: `announcement_${announcement.id}`,
              },
            });

            const taskData = {
              title: `📢 ${announcement.title}`,
              description: announcement.message || 'Course announcement',
              dueDate: null,
              completed: announcement.read_state === 'read',
              category: 'announcement',
              course: course.name,
              sourceUrl: announcement.html_url,
              metadata: {
                postedAt: announcement.posted_at || announcement.created_at,
                type: 'announcement',
              },
            };

            if (existingTask) {
              await prisma.task.update({
                where: { id: existingTask.id },
                data: taskData,
              });
            } else {
              await prisma.task.create({
                data: {
                  userId: user.id,
                  source: 'canvas',
                  sourceId: `announcement_${announcement.id}`,
                  ...taskData,
                },
              });
            }

            totalItems++;
          }
        }

        // 3. QUIZZES
        const quizzesResponse = await fetch(
          `${canvasUrl}/api/v1/courses/${course.id}/quizzes`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (quizzesResponse.ok) {
          const quizzes = await quizzesResponse.json();

          for (const quiz of quizzes) {
            const dueDate = quiz.due_at ? new Date(quiz.due_at) : null;

            const existingTask = await prisma.task.findFirst({
              where: {
                userId: user.id,
                source: 'canvas',
                sourceId: `quiz_${quiz.id}`,
              },
            });

            const taskData = {
              title: `📝 ${quiz.title}`,
              description: quiz.description || `Quiz for ${course.name}`,
              dueDate: dueDate,
              completed: false,
              category: 'quiz',
              course: course.name,
              sourceUrl: quiz.html_url,
              metadata: {
                points: quiz.points_possible,
                timeLimit: quiz.time_limit,
                allowedAttempts: quiz.allowed_attempts,
                type: 'quiz',
              },
            };

            if (existingTask) {
              await prisma.task.update({
                where: { id: existingTask.id },
                data: taskData,
              });
            } else {
              await prisma.task.create({
                data: {
                  userId: user.id,
                  source: 'canvas',
                  sourceId: `quiz_${quiz.id}`,
                  ...taskData,
                },
              });
            }

            totalItems++;
          }
        }

        // 4. DISCUSSIONS (excluding announcements)
        const discussionsResponse = await fetch(
          `${canvasUrl}/api/v1/courses/${course.id}/discussion_topics?per_page=20`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (discussionsResponse.ok) {
          const discussions = await discussionsResponse.json();

          for (const discussion of discussions) {
            if (discussion.is_announcement) continue;

            const dueDate = discussion.assignment?.due_at ? new Date(discussion.assignment.due_at) : null;

            const existingTask = await prisma.task.findFirst({
              where: {
                userId: user.id,
                source: 'canvas',
                sourceId: `discussion_${discussion.id}`,
              },
            });

            const taskData = {
              title: `💬 ${discussion.title}`,
              description: discussion.message || 'Discussion topic',
              dueDate: dueDate,
              completed: false,
              category: 'discussion',
              course: course.name,
              sourceUrl: discussion.html_url,
              metadata: {
                requiresInitialPost: discussion.require_initial_post,
                type: 'discussion',
              },
            };

            if (existingTask) {
              await prisma.task.update({
                where: { id: existingTask.id },
                data: taskData,
              });
            } else {
              await prisma.task.create({
                data: {
                  userId: user.id,
                  source: 'canvas',
                  sourceId: `discussion_${discussion.id}`,
                  ...taskData,
                },
              });
            }

            totalItems++;
          }
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
      message: `Synced ${totalItems} items from Canvas (assignments, announcements, quizzes, discussions)`,
      itemCount: totalItems,
    });
  } catch (error) {
    console.error('Canvas sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Canvas data' },
      { status: 500 }
    );
  }
}
