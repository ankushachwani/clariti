# Clariti Integration Setup Guide

This comprehensive guide will walk you through setting up all the integrations for Clariti. Follow these instructions carefully to connect Canvas, Gmail, Google Calendar, Discord, Slack, and Notion to your Clariti account.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Cohere AI Setup](#cohere-ai-setup)
4. [Google OAuth (Gmail & Calendar)](#google-oauth-gmail--calendar)
5. [Canvas LMS Integration](#canvas-lms-integration)
6. [Discord Integration](#discord-integration)
7. [Slack Integration](#slack-integration)
8. [Notion Integration](#notion-integration)
9. [Environment Variables](#environment-variables)
10. [Deployment](#deployment)
11. [Testing Integrations](#testing-integrations)

---

## Prerequisites

Before setting up integrations, ensure you have:

- Node.js 18+ installed
- PostgreSQL database (local or cloud-hosted)
- A Google account for OAuth
- Access to Canvas LMS as a student or instructor
- Discord, Slack, and Notion accounts (optional but recommended)

---

## Database Setup

### 1. Install PostgreSQL

**Option A: Local Installation**
```bash
# macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Download and install from https://www.postgresql.org/download/windows/
```

**Option B: Cloud Database (Recommended for Production)**

Use one of these cloud providers:
- **Supabase**: https://supabase.com (Free tier available)
- **Railway**: https://railway.app (Free tier available)
- **Neon**: https://neon.tech (Free tier available)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE clariti;

# Create user (optional)
CREATE USER clariti_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE clariti TO clariti_user;

# Exit
\q
```

### 3. Configure Database URL

Update your `.env` file:

```bash
# For local database
DATABASE_URL="postgresql://username:password@localhost:5432/clariti?schema=public"

# For cloud database (example with Supabase)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"
```

### 4. Run Prisma Migrations

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

---

## Cohere AI Setup

Cohere provides the AI-powered summarization and prioritization features.

### 1. Create Cohere Account

1. Go to https://cohere.com
2. Click "Get Started" or "Sign Up"
3. Create an account (free tier available)

### 2. Generate API Key

1. Log in to your Cohere dashboard
2. Navigate to "API Keys" section
3. Click "Create New API Key"
4. Copy the API key (starts with something like `xxx...`)
5. Name it "Clariti Development"

### 3. Add to Environment Variables

```bash
COHERE_API_KEY="your-cohere-api-key-here"
```

### 4. Test Cohere Integration

```bash
# Run this test in Node.js console
node
```

```javascript
const { CohereClient } = require('cohere-ai');
const cohere = new CohereClient({ token: 'your-api-key' });

cohere.generate({
  prompt: 'Summarize this: Study for midterm exam in CS220',
  maxTokens: 50,
}).then(response => console.log(response.generations[0].text));
```

---

## Google OAuth (Gmail & Calendar)

This single setup enables both Gmail and Google Calendar integration.

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click "New Project" (top left)
3. Name: `Clariti`
4. Click "Create"

### 2. Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search and enable the following APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **Google People API**

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" (unless you have Google Workspace)
3. Click "Create"

**Fill in the form:**
- App name: `Clariti`
- User support email: Your email
- Developer contact: Your email
- Click "Save and Continue"

**Scopes:**
1. Click "Add or Remove Scopes"
2. Add these scopes:
   ```
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/calendar.readonly
   ```
3. Click "Update" then "Save and Continue"

**Test Users (for development):**
1. Add your email address and any other test users
2. Click "Save and Continue"

### 4. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "+ Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Name: `Clariti Web Client`

**Authorized JavaScript origins:**
```
http://localhost:3000
https://your-production-domain.com
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
https://your-production-domain.com/api/auth/callback/google
```

5. Click "Create"
6. **Save the Client ID and Client Secret**

### 5. Add to Environment Variables

```bash
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

---

## Canvas LMS Integration

Canvas requires OAuth2 setup for secure access to student data.

### 1. Access Canvas Developer Keys

**For Students:**
- You'll need to request API access from your institution's Canvas administrator
- Ask for a developer key with these scopes:
  - `url:GET|/api/v1/courses`
  - `url:GET|/api/v1/courses/:course_id/assignments`
  - `url:GET|/api/v1/users/:user_id/courses`

**For Developers/Testing:**
1. Create a free Canvas instructor account at https://canvas.instructure.com/register
2. Go to Account > Settings > Approved Integrations
3. Click "+ Developer Key"

### 2. Create Developer Key

Fill in the form:

- **Key Name**: Clariti
- **Owner Email**: Your email
- **Redirect URIs**:
  ```
  http://localhost:3000/api/integrations/canvas/callback
  https://your-domain.com/api/integrations/canvas/callback
  ```
- **Scopes**: Select these:
  - `url:GET|/api/v1/courses`
  - `url:GET|/api/v1/courses/:course_id/assignments`
  - `url:GET|/api/v1/users/self/todo`
  - `url:GET|/api/v1/users/:user_id/courses`
  - `url:GET|/api/v1/calendar_events`

Click "Save Key"

### 3. Get Client ID and Secret

1. After creating, you'll see the developer key in the list
2. Copy the **Client ID** (numeric ID)
3. Click "Show Key" to reveal the **Client Secret**

### 4. Create Canvas API Routes

Create `/app/api/integrations/canvas/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const canvasUrl = process.env.CANVAS_API_URL || 'https://canvas.instructure.com';
  const clientId = process.env.CANVAS_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/canvas/callback`;

  const authUrl = `${canvasUrl}/login/oauth2/auth?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=url:GET|/api/v1/courses url:GET|/api/v1/courses/:course_id/assignments`;

  return NextResponse.redirect(authUrl);
}
```

Create `/app/api/integrations/canvas/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect('/');
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('/profile?error=canvas_auth_failed');
  }

  // Exchange code for access token
  const canvasUrl = process.env.CANVAS_API_URL || 'https://canvas.instructure.com';
  const tokenResponse = await fetch(`${canvasUrl}/login/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.CANVAS_CLIENT_ID,
      client_secret: process.env.CANVAS_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/canvas/callback`,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();

  // Save integration
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (user) {
    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'canvas',
        },
      },
      create: {
        userId: user.id,
        provider: 'canvas',
        isConnected: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      update: {
        isConnected: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });
  }

  return NextResponse.redirect('/profile?canvas=connected');
}
```

### 5. Add to Environment Variables

```bash
CANVAS_API_URL="https://canvas.instructure.com"
CANVAS_CLIENT_ID="your-canvas-client-id"
CANVAS_CLIENT_SECRET="your-canvas-client-secret"
```

### 6. Create Test Course and Assignments

If using a free instructor account:

1. Create a course: Dashboard > Start a New Course
2. Add assignments: Course > Assignments > + Assignment
3. Add yourself as a student (use another email or test account)

---

## Discord Integration

Discord integration allows Clariti to monitor course server announcements.

### 1. Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name: `Clariti`
4. Click "Create"

### 2. Configure OAuth2

1. Go to "OAuth2" in the left sidebar
2. Add redirect URLs:
   ```
   http://localhost:3000/api/integrations/discord/callback
   https://your-domain.com/api/integrations/discord/callback
   ```

### 3. Create Bot

1. Go to "Bot" section
2. Click "Add Bot" > "Yes, do it!"
3. **Bot Permissions**: Select:
   - Read Messages/View Channels
   - Read Message History
4. Copy the **Bot Token** (keep this secret!)

### 4. Get Client ID and Secret

1. Go to "OAuth2" > "General"
2. Copy **Client ID**
3. Copy **Client Secret**

### 5. Bot Scopes

Under OAuth2 > URL Generator, select:
- `bot`
- `guilds`
- `guilds.members.read`
- `messages.read`

### 6. Invite Bot to Server

1. Use the generated OAuth2 URL from URL Generator
2. Select your Discord server
3. Authorize the bot

### 7. Create Discord API Routes

Create `/app/api/integrations/discord/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/discord/callback`;

  const authUrl = `https://discord.com/api/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=identify guilds guilds.members.read`;

  return NextResponse.redirect(authUrl);
}
```

### 8. Add to Environment Variables

```bash
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_BOT_TOKEN="your-discord-bot-token"
```

---

## Slack Integration

Slack integration monitors team project channels and direct messages.

### 1. Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. App Name: `Clariti`
5. Pick your workspace
6. Click "Create App"

### 2. Configure OAuth Scopes

1. Go to "OAuth & Permissions"
2. Scroll to "Scopes" section
3. Add these **Bot Token Scopes**:
   - `channels:history`
   - `channels:read`
   - `groups:history`
   - `groups:read`
   - `im:history`
   - `im:read`
   - `users:read`

### 3. Add Redirect URLs

Under "OAuth & Permissions" > "Redirect URLs":
```
http://localhost:3000/api/integrations/slack/callback
https://your-domain.com/api/integrations/slack/callback
```

### 4. Install to Workspace

1. Click "Install to Workspace"
2. Review permissions
3. Click "Allow"
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 5. Get Client ID and Secret

1. Go to "Basic Information"
2. Under "App Credentials":
   - Copy **Client ID**
   - Copy **Client Secret**

### 6. Create Slack API Routes

Create `/app/api/integrations/slack/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`;

  const authUrl = `https://slack.com/oauth/v2/authorize?` +
    `client_id=${clientId}&` +
    `scope=channels:history,channels:read,groups:history,groups:read,im:history,im:read,users:read&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(authUrl);
}
```

### 7. Add to Environment Variables

```bash
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
```

---

## Notion Integration

Notion integration imports personal notes and task databases.

### 1. Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Name: `Clariti`
4. Associated workspace: Choose your workspace
5. Click "Submit"

### 2. Configure Capabilities

Under "Capabilities", enable:
- **Read content**: Yes
- **Update content**: No (optional)
- **Insert content**: No (optional)

### 3. Get Integration Token

1. Copy the **Internal Integration Token**
   - Starts with `secret_`
   - This is used for private integrations

### 4. Create Public OAuth Integration (Recommended)

For public distribution:

1. Go to "Distribution" tab
2. Click "Make public"
3. Add OAuth redirect URIs:
   ```
   http://localhost:3000/api/integrations/notion/callback
   https://your-domain.com/api/integrations/notion/callback
   ```
4. Copy **OAuth client ID** and **OAuth client secret**

### 5. Share Notion Pages

Users need to share specific pages with your integration:

1. Open a Notion page
2. Click "Share" (top right)
3. Click "Invite"
4. Select "Clariti" integration
5. Click "Invite"

### 6. Create Notion API Routes

Create `/app/api/integrations/notion/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/notion/callback`;

  const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `owner=user&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(authUrl);
}
```

### 7. Add to Environment Variables

```bash
NOTION_CLIENT_ID="your-notion-client-id"
NOTION_CLIENT_SECRET="your-notion-client-secret"
```

---

## Environment Variables

Create a `.env` file in the project root with all your credentials:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/clariti?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Cohere AI
COHERE_API_KEY="your-cohere-api-key"

# Google OAuth (Gmail + Calendar)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Canvas LMS
CANVAS_API_URL="https://canvas.instructure.com"
CANVAS_CLIENT_ID="your-canvas-client-id"
CANVAS_CLIENT_SECRET="your-canvas-client-secret"

# Discord
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_BOT_TOKEN="your-discord-bot-token"

# Slack
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"

# Notion
NOTION_CLIENT_ID="your-notion-client-id"
NOTION_CLIENT_SECRET="your-notion-client-secret"
```

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET`

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add all environment variables
5. Deploy

**Important**: Update redirect URIs in all OAuth apps to use your Vercel domain:
- `https://your-app.vercel.app/api/auth/callback/google`
- `https://your-app.vercel.app/api/integrations/[provider]/callback`

### Railway

1. Go to https://railway.app
2. Create new project
3. Add PostgreSQL database
4. Deploy from GitHub
5. Add environment variables
6. Update redirect URIs

### Other Platforms

Clariti can be deployed to:
- **Netlify**: Requires serverless function configuration
- **AWS**: Use EC2 or Amplify
- **Google Cloud**: Use Cloud Run or App Engine
- **DigitalOcean**: Use App Platform

---

## Testing Integrations

### 1. Start Development Server

```bash
npm run dev
```

Navigate to http://localhost:3000

### 2. Sign In

1. Click "Sign In"
2. Authorize with Google
3. You should be redirected to the dashboard

### 3. Test Each Integration

Go to Profile > Integrations and click "Connect" for each integration:

**Canvas:**
- Should redirect to Canvas login
- Authorize the app
- Verify "Connected" status
- Check if assignments sync

**Gmail:**
- Already connected via Google OAuth
- Verify emails are being read

**Google Calendar:**
- Already connected via Google OAuth
- Verify events sync to calendar page

**Discord:**
- Authorize bot access to servers
- Select which servers to monitor
- Verify announcements sync

**Slack:**
- Authorize workspace access
- Verify channels are accessible
- Test message reading

**Notion:**
- Authorize integration
- Share test pages with integration
- Verify tasks import

### 4. Verify Database

```bash
npx prisma studio
```

Check:
- Users table has your account
- Integrations table shows connected services
- Tasks table receives data from integrations

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```
Error: P1001: Can't reach database server
```
**Solution**: Check DATABASE_URL is correct and PostgreSQL is running

**2. OAuth Redirect Mismatch**
```
Error: redirect_uri_mismatch
```
**Solution**: Ensure redirect URIs match exactly in OAuth app settings

**3. Cohere API Error**
```
Error: 401 Unauthorized
```
**Solution**: Verify COHERE_API_KEY is correct and has not expired

**4. Canvas API 403 Forbidden**
```
Error: insufficient scopes
```
**Solution**: Check developer key has all required scopes enabled

**5. NextAuth Session Error**
```
Error: [next-auth][error][JWT_SESSION_ERROR]
```
**Solution**: Regenerate NEXTAUTH_SECRET and clear browser cookies

### Getting Help

- **Canvas**: https://community.canvaslms.com
- **Google OAuth**: https://developers.google.com/identity
- **Discord**: https://discord.com/developers/docs
- **Slack**: https://api.slack.com/support
- **Notion**: https://developers.notion.com
- **Cohere**: https://docs.cohere.com

---

## Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Rotate secrets regularly** - Change API keys every 90 days
3. **Use HTTPS in production** - Never use HTTP for OAuth
4. **Limit token scopes** - Request minimum permissions needed
5. **Encrypt sensitive data** - Use Prisma's encryption for tokens
6. **Enable 2FA** - On all developer accounts
7. **Monitor API usage** - Set up alerts for unusual activity

---

## Next Steps

After setting up all integrations:

1. **Test the AI features** - Create sample tasks and verify AI summarization
2. **Set up CRON jobs** - For automated hourly syncing
3. **Configure notifications** - Test email and push notifications
4. **Add error logging** - Implement Sentry or similar
5. **Monitor performance** - Set up analytics
6. **Create Canvas test course** - Add fake students (Ankush, Anthony, Linus)

---

## Support

For issues specific to Clariti setup:
- Create an issue on GitHub
- Check documentation at `/docs`
- Contact the development team

Built with ❤️ for HackUMass
