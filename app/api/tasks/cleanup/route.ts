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

    // Delete all tasks matching unwanted patterns
    const deletePatterns = [
      'birthday',
      'bday',
      'b-day',
      "Brady's Bday",
      'Failed production deployment',
      'Deployment failed',
      'Deployment succeeded',
      'Build failed',
      'Build succeeded',
      'Extraordinary General Meeting',
      'Annual General Meeting',
      'EGM',
      'AGM',
      'statement is available',
      'Your credit card statement',
      'FOLIO_DPID_CLID',
    ];

    let totalDeleted = 0;

    // Delete tasks with these patterns in title or description
    for (const pattern of deletePatterns) {
      const result = await prisma.task.deleteMany({
        where: {
          userId: user.id,
          OR: [
            {
              title: {
                contains: pattern,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: pattern,
                mode: 'insensitive',
              },
            },
          ],
        },
      });

      totalDeleted += result.count;
    }

    console.log(`Cleaned up ${totalDeleted} unwanted tasks for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${totalDeleted} unwanted tasks`,
      deletedCount: totalDeleted,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to clean up tasks' },
      { status: 500 }
    );
  }
}
