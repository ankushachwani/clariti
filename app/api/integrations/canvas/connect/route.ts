import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Canvas OAuth parameters
  const canvasUrl = process.env.CANVAS_API_URL || 'https://canvas.instructure.com';
  const clientId = process.env.CANVAS_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/canvas/callback`;
  const state = Buffer.from(JSON.stringify({ email: session.user.email })).toString('base64');

  if (!clientId) {
    return NextResponse.json({ error: 'Canvas not configured' }, { status: 500 });
  }

  // Build Canvas OAuth authorization URL
  const authUrl = new URL(`${canvasUrl}/login/oauth2/auth`);
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', '/auth/userinfo');

  return NextResponse.redirect(authUrl.toString());
}
