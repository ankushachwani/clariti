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

    const results: any[] = [];
    const baseUrl = process.env.NEXTAUTH_URL || 'https://clariti-ten.vercel.app';

    // Sync each connected integration
    for (const integration of user.integrations) {
      try {
        let syncUrl = '';
        
        if (integration.provider === 'canvas') {
          syncUrl = `${baseUrl}/api/integrations/canvas/sync`;
        } else if (integration.provider === 'gmail') {
          syncUrl = `${baseUrl}/api/integrations/gmail/sync`;
        } else if (integration.provider === 'google_calendar') {
          syncUrl = `${baseUrl}/api/integrations/calendar/sync`;
        } else if (integration.provider === 'slack') {
          syncUrl = `${baseUrl}/api/integrations/slack/sync`;
        } else {
          continue; // Skip unsupported integrations
        }

        const response = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Cookie': request.headers.get('cookie') || '',
          },
        });

        const data = await response.json();
        results.push({
          provider: integration.provider,
          success: response.ok,
          ...data,
        });
      } catch (error) {
        results.push({
          provider: integration.provider,
          success: false,
          error: String(error),
        });
      }
    }

    // Update lastSyncedAt for all integrations
    for (const integration of user.integrations) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed for all integrations',
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync integrations' },
      { status: 500 }
    );
  }
}
