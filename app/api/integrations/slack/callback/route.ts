import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/onboarding?error=slack_${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/onboarding?error=slack_missing_params`
    );
  }

  if (!session?.user?.email) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/auth/signin?error=slack_no_session`
    );
  }

  try {
    // Verify state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    if (stateData.email !== session.user.email) {
      throw new Error('State mismatch');
    }

    // Exchange code for access token
    const clientId = process.env.SLACK_CLIENT_ID!;
    const clientSecret = process.env.SLACK_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`;

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error('Slack token error:', tokenData);
      throw new Error(tokenData.error || 'Failed to get Slack access token');
    }

    const { team, authed_user } = tokenData;

    // For user scopes, the token is in authed_user.access_token (not top-level access_token)
    const userAccessToken = authed_user?.access_token;

    if (!userAccessToken) {
      console.error('No user access token in response:', tokenData);
      throw new Error('Failed to get user access token');
    }

    console.log('Slack OAuth success - User token obtained:', userAccessToken.substring(0, 10) + '...');

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      throw new Error('User not found');
    }

    // Store Slack integration
    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: dbUser.id,
          provider: 'slack',
        },
      },
      create: {
        userId: dbUser.id,
        provider: 'slack',
        isConnected: true,
        accessToken: userAccessToken,
        metadata: {
          teamId: team.id,
          teamName: team.name,
          userId: authed_user.id,
          scopes: authed_user.scope,
        },
      },
      update: {
        isConnected: true,
        accessToken: userAccessToken,
        metadata: {
          teamId: team.id,
          teamName: team.name,
          userId: authed_user.id,
          scopes: authed_user.scope,
        },
        lastSyncedAt: new Date(),
      },
    });

    // Redirect back to onboarding or profile with success message
    const baseUrl = process.env.NEXTAUTH_URL || 'https://clariti-ten.vercel.app';
    const redirectUrl = `${baseUrl}/profile?success=slack_connected`;
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://clariti-ten.vercel.app';
    return NextResponse.redirect(
      `${baseUrl}/profile?error=slack_failed`
    );
  }
}
