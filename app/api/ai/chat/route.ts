import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import { CohereClient } from 'cohere-ai';
import { format, isToday, isTomorrow, isThisWeek, startOfDay, endOfDay, addDays } from 'date-fns';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's tasks and calendar events
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = addDays(now, 7);

    const [allTasks, todayTasks, weekTasks, overdueTasks, completedToday, calendarEvents] = await Promise.all([
      // All incomplete tasks
      prisma.task.findMany({
        where: {
          userId: user.id,
          completed: false,
          category: { not: 'announcement' },
        },
        orderBy: [
          { priority: 'desc' },
          { urgencyScore: 'desc' },
          { dueDate: 'asc' },
        ],
        take: 50,
      }),
      // Tasks due today
      prisma.task.findMany({
        where: {
          userId: user.id,
          completed: false,
          category: { not: 'announcement' },
          dueDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      // Tasks due this week
      prisma.task.findMany({
        where: {
          userId: user.id,
          completed: false,
          category: { not: 'announcement' },
          dueDate: {
            gte: now,
            lte: weekEnd,
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      // Overdue tasks
      prisma.task.findMany({
        where: {
          userId: user.id,
          completed: false,
          category: { not: 'announcement' },
          dueDate: {
            lt: todayStart,
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      // Completed today
      prisma.task.findMany({
        where: {
          userId: user.id,
          completed: true,
          category: { not: 'announcement' },
          completedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      // Calendar events
      prisma.task.findMany({
        where: {
          userId: user.id,
          category: 'calendar',
          dueDate: {
            gte: now,
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
    ]);

    // Prepare context for AI
    const contextData = {
      totalTasks: allTasks.length,
      todayTasksCount: todayTasks.length,
      weekTasksCount: weekTasks.length,
      overdueCount: overdueTasks.length,
      completedTodayCount: completedToday.length,
      priorityTasks: allTasks.slice(0, 10).map((t) => ({
        title: t.title,
        dueDate: t.dueDate ? format(new Date(t.dueDate), 'MMM d, yyyy') : 'No due date',
        priority: t.priority,
        course: t.course,
        description: t.description,
      })),
      todayTasks: todayTasks.map((t) => ({
        title: t.title,
        course: t.course,
        description: t.description,
      })),
      weekTasks: weekTasks.map((t) => ({
        title: t.title,
        dueDate: t.dueDate ? format(new Date(t.dueDate), 'MMM d, yyyy') : 'No due date',
        course: t.course,
      })),
      overdueTasks: overdueTasks.slice(0, 10).map((t) => ({
        title: t.title,
        dueDate: t.dueDate ? format(new Date(t.dueDate), 'MMM d, yyyy') : 'No due date',
        course: t.course,
      })),
      upcomingEvents: calendarEvents.slice(0, 10).map((e) => ({
        title: e.title,
        date: e.dueDate ? format(new Date(e.dueDate), 'MMM d, yyyy h:mm a') : 'No date',
        description: e.description,
      })),
    };

    // Create prompt for Cohere
    const systemContext = `You are Clariti AI Assistant, a helpful productivity assistant for a college student. You have access to their task list and calendar.

Current Data:
- Total incomplete tasks: ${contextData.totalTasks}
- Tasks due today: ${contextData.todayTasksCount}
- Tasks due this week: ${contextData.weekTasksCount}
- Overdue tasks: ${contextData.overdueCount}
- Completed today: ${contextData.completedTodayCount}

Priority Tasks (Top 10):
${contextData.priorityTasks.map((t, i) => `${i + 1}. ${t.title}${t.course ? ` (${t.course})` : ''} - Due: ${t.dueDate} (Priority: ${t.priority}/10)`).join('\n')}

Tasks Due Today:
${contextData.todayTasks.length > 0 ? contextData.todayTasks.map((t, i) => `${i + 1}. ${t.title}${t.course ? ` (${t.course})` : ''}`).join('\n') : 'No tasks due today'}

Tasks Due This Week:
${contextData.weekTasks.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}${t.course ? ` (${t.course})` : ''} - ${t.dueDate}`).join('\n')}

Overdue Tasks:
${contextData.overdueTasks.length > 0 ? contextData.overdueTasks.map((t, i) => `${i + 1}. ${t.title}${t.course ? ` (${t.course})` : ''} - Was due: ${t.dueDate}`).join('\n') : 'No overdue tasks'}

Upcoming Calendar Events:
${contextData.upcomingEvents.length > 0 ? contextData.upcomingEvents.map((e, i) => `${i + 1}. ${e.title} - ${e.date}`).join('\n') : 'No upcoming events'}

Answer the user's question based on this data. Be concise, friendly, and helpful. If asked about specific tasks, reference them by name. Provide actionable advice when appropriate.`;

    const response = await cohere.chat({
      model: 'command-r7b-12-2024',
      message: `${systemContext}\n\nUser Question: ${message}`,
      temperature: 0.7,
      maxTokens: 500,
    });

    return NextResponse.json({
      response: response.text.trim(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
