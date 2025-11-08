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
      include: {
        integrations: {
          where: {
            isConnected: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // TODO: Implement actual sync logic for each integration
    // This is a placeholder that updates the lastSyncedAt timestamp

    for (const integration of user.integrations) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, synced: user.integrations.length });
  } catch (error) {
    console.error('Error syncing integrations:', error);
    return NextResponse.json(
      { error: 'Failed to sync integrations' },
      { status: 500 }
    );
  }
}
