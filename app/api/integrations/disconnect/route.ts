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

    const { provider } = await request.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the integration to get the access token
    const integration = await prisma.integration.findFirst({
      where: {
        userId: user.id,
        provider: provider,
      },
    });

    if (integration) {
      // Revoke access token based on provider
      try {
        if (provider === 'slack') {
          // Revoke Slack token
          const accessToken = integration.accessToken;
          if (accessToken) {
            await fetch('https://slack.com/api/auth.revoke', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `token=${accessToken}`,
            });
          }
        } else if (provider === 'google_calendar' || provider === 'gmail') {
          // Revoke Google token (Gmail and Calendar use same token)
          const account = await prisma.account.findFirst({
            where: {
              userId: user.id,
              provider: 'google',
            },
          });
          
          if (account?.access_token) {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${account.access_token}`, {
              method: 'POST',
            });
          }
        } else if (provider === 'canvas') {
          // Canvas tokens are personal access tokens - can't be revoked via API
          // User needs to manually revoke from Canvas settings
          console.log('Canvas token should be manually revoked from Canvas settings');
        }
      } catch (revokeError) {
        console.error('Error revoking token:', revokeError);
        // Continue to delete from database even if revoke fails
      }

      // Delete the integration from database
      await prisma.integration.delete({
        where: {
          id: integration.id,
        },
      });
    }

    return NextResponse.json({ 
      success: true,
      message: `${provider} disconnected successfully` 
    });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
