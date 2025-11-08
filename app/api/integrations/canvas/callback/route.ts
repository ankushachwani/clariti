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
      `${process.env.NEXTAUTH_URL}/onboarding?error=canvas_${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/onboarding?error=canvas_missing_params`
    );
  }

  if (!session?.user?.email) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/auth/signin?error=canvas_no_session`
    );
  }

  try {
    // Verify state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    if (stateData.email !== session.user.email) {
      throw new Error('State mismatch');
    }

    // Exchange code for access token
    const canvasUrl = process.env.CANVAS_API_URL || 'https://canvas.instructure.com';
    const clientId = process.env.CANVAS_CLIENT_ID!;
    const clientSecret = process.env.CANVAS_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/canvas/callback`;

    const tokenResponse = await fetch(`${canvasUrl}/login/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Canvas token error:', errorText);
      throw new Error('Failed to get Canvas access token');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, user } = tokenData;

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      throw new Error('User not found');
    }

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Store Canvas integration
    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: dbUser.id,
          provider: 'canvas',
        },
      },
      create: {
        userId: dbUser.id,
        provider: 'canvas',
        isConnected: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        metadata: {
          canvasUserId: user.id,
          canvasUserName: user.name,
          canvasUrl: canvasUrl,
        },
      },
      update: {
        isConnected: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        metadata: {
          canvasUserId: user.id,
          canvasUserName: user.name,
          canvasUrl: canvasUrl,
        },
        lastSyncedAt: new Date(),
      },
    });

    // Redirect back to onboarding or profile (stay on same page)
    const referer = request.headers.get('referer') || '';
    const redirectUrl = referer.includes('/profile') 
      ? `${process.env.NEXTAUTH_URL}/profile?success=canvas_connected`
      : `${process.env.NEXTAUTH_URL}/onboarding?success=canvas_connected`;
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Canvas OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/onboarding?error=canvas_failed`
    );
  }
}
