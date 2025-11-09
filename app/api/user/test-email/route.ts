import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import { sendDailyDigest } from '@/lib/email/mailer';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email notifications are enabled
    if (!user.settings?.emailNotifications) {
      return NextResponse.json(
        { error: 'Email notifications are disabled. Please enable them first.' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'No tasks found. Add some tasks first to see the email preview.' },
        { status: 400 }
      );
    }

    // Send test email
    await sendDailyDigest(user.email, user.name || 'there', tasks);

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${user.email}`,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email. Check your SMTP settings.' },
      { status: 500 }
    );
  }
}
