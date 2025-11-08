import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accessToken, canvasUrl } = body;

    if (!accessToken || !canvasUrl) {
      return NextResponse.json(
        { error: 'Access token and Canvas URL are required' },
        { status: 400 }
      );
    }

    // Validate the token by trying to fetch user profile
    const testResponse = await fetch(`${canvasUrl}/api/v1/users/self/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!testResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid Canvas access token or URL' },
        { status: 400 }
      );
    }

    const canvasUser = await testResponse.json();

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
        accessToken: accessToken,
        metadata: {
          canvasUserId: canvasUser.id,
          canvasUserName: canvasUser.name,
          canvasUrl: canvasUrl,
          canvasEmail: canvasUser.primary_email,
        },
      },
      update: {
        isConnected: true,
        accessToken: accessToken,
        metadata: {
          canvasUserId: canvasUser.id,
          canvasUserName: canvasUser.name,
          canvasUrl: canvasUrl,
          canvasEmail: canvasUser.primary_email,
        },
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        name: canvasUser.name,
        email: canvasUser.primary_email,
      },
    });
  } catch (error) {
    console.error('Canvas token save error:', error);
    return NextResponse.json(
      { error: 'Failed to save Canvas integration' },
      { status: 500 }
    );
  }
}
