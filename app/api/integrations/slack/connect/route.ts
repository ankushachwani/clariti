import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`;
  const state = Buffer.from(JSON.stringify({ email: session.user.email })).toString('base64');

  if (!clientId) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 });
  }

  // Slack OAuth scopes (user scopes)
  const scopes = [
    'channels:history',
    'channels:read',
    'groups:history',
    'groups:read',
    'users:read',
    'im:history',
    'im:read',
    'stars:read', // Read starred/saved items
  ].join(',');

  // Build Slack OAuth authorization URL
  const authUrl = new URL('https://slack.com/oauth/v2/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('granular_bot_scope', '1'); // Prevent desktop app launch

  return NextResponse.redirect(authUrl.toString());
}
