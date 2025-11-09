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
          where: { isConnected: true },
        },
        accounts: true, // Get OAuth accounts too
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const results: any[] = [];
    const baseUrl = process.env.NEXTAUTH_URL || 'https://clariti-ten.vercel.app';

    // Check if Google is connected (for Gmail and Calendar)
    const googleAccount = user.accounts.find(acc => acc.provider === 'google');
    
    console.log('Google account found:', !!googleAccount);
    
    // Sync Gmail if Google is connected
    if (googleAccount) {
      console.log('Syncing Gmail...');
      try {
        const response = await fetch(`${baseUrl}/api/integrations/gmail/sync`, {
          method: 'POST',
          headers: {
            'Cookie': request.headers.get('cookie') || '',
          },
        });

        const data = await response.json();
        console.log('Gmail sync result:', data);
        results.push({
          provider: 'gmail',
          success: response.ok,
          ...data,
        });
      } catch (error) {
        console.error('Gmail sync error:', error);
        results.push({
          provider: 'gmail',
          success: false,
          error: String(error),
        });
      }

      // Sync Google Calendar if Google is connected
      try {
        const response = await fetch(`${baseUrl}/api/integrations/calendar/sync`, {
          method: 'POST',
          headers: {
            'Cookie': request.headers.get('cookie') || '',
          },
        });

        const data = await response.json();
        results.push({
          provider: 'google_calendar',
          success: response.ok,
          ...data,
        });
      } catch (error) {
        results.push({
          provider: 'google_calendar',
          success: false,
          error: String(error),
        });
      }
    }

    // Sync each connected integration (Canvas, Slack, etc.)
    for (const integration of user.integrations) {
      try {
        let syncUrl = '';
        
        if (integration.provider === 'canvas') {
          syncUrl = `${baseUrl}/api/integrations/canvas/sync`;
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
