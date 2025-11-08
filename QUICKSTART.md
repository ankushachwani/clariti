# Clariti Quick Start Guide

Get Clariti up and running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or use a free cloud provider)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Database

### Option A: Use a Free Cloud Database (Easiest)

1. Go to https://railway.app or https://supabase.com
2. Create a new PostgreSQL database
3. Copy the connection string

### Option B: Local PostgreSQL

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15
createdb clariti

# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb clariti
```

## Step 3: Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and add these required variables:

```bash
# Database (from Step 2)
DATABASE_URL="postgresql://user:password@localhost:5432/clariti"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Cohere AI (get free key at https://cohere.com)
COHERE_API_KEY="your-key-here"

# Google OAuth (follow steps below)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

## Step 4: Set Up Google OAuth (Required)

1. Go to https://console.cloud.google.com
2. Create a new project called "Clariti"
3. Enable Gmail API and Google Calendar API
4. Go to "OAuth consent screen":
   - Choose External
   - App name: Clariti
   - Add your email
   - Add scopes: email, profile, gmail.readonly, calendar.readonly
   - Add test users (your email)
5. Go to "Credentials":
   - Create OAuth Client ID
   - Type: Web application
   - Authorized redirect: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env`

## Step 5: Set Up Database Schema

```bash
npx prisma generate
npx prisma db push
```

## Step 6: Run the App

```bash
npm run dev
```

Open http://localhost:3000 🎉

## Step 7: Sign In and Test

1. Click "Sign In"
2. Sign in with Google
3. You'll be redirected to the Dashboard
4. Go to Profile → Settings to connect more integrations

## Optional: Connect Additional Integrations

For detailed setup of Canvas, Discord, Slack, and Notion, see [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md)

## Common Issues

### Database Connection Error
**Error**: `P1001: Can't reach database server`

**Solution**:
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running: `brew services start postgresql@15` (macOS)

### OAuth Redirect Error
**Error**: `redirect_uri_mismatch`

**Solution**:
- Make sure redirect URI in Google Console exactly matches:
  `http://localhost:3000/api/auth/callback/google`

### Cohere API Error
**Error**: `401 Unauthorized`

**Solution**:
- Get a free API key at https://cohere.com
- Copy it to COHERE_API_KEY in `.env`

## Next Steps

1. ✅ App is running locally
2. Connect Canvas LMS (see [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md#canvas-lms-integration))
3. Connect Discord/Slack (see [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md#discord-integration))
4. Deploy to Vercel (see [README.md](./README.md#deployment))

## Getting Help

- Check [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md) for detailed integration guides
- Review [README.md](./README.md) for full documentation
- Open an issue on GitHub

---

**You're all set!** Clariti is now running and ready to help you organize your academic life.
