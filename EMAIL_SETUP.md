# Gmail SMTP Email Setup

This guide will help you set up Gmail SMTP for sending email notifications from Clariti.

## Step 1: Enable 2-Factor Authentication

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security**
3. Enable **2-Step Verification** if not already enabled

## Step 2: Generate App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **Mail** and **Other (Custom name)**
3. Name it "Clariti" or "Clariti Notifications"
4. Click **Generate**
5. Copy the 16-character password (remove spaces)

## Step 3: Update Environment Variables

Add these to your `.env` file:

```bash
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-16-char-app-password"
```

**Important:** Use the App Password, NOT your regular Gmail password!

## Step 4: Test the Email Service

You can test it by calling the daily digest endpoint manually:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/daily-digest
```

Or on production:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://clariti-ten.vercel.app/api/cron/daily-digest
```

## Step 5: Set Up Vercel Cron (for automated daily emails)

Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/prioritize",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 * * * *"
    }
  ]
}
```

The daily digest cron runs **every hour** and checks each user's preferred time setting. Users can set their preferred time in **Profile → Notifications → Daily Brief Time**.

## How It Works

1. User enables "Daily Brief" and "Email Notifications" in their profile
2. User selects their preferred time (e.g., 8:00 AM)
3. The cron job runs every hour
4. It checks each user's timezone and preferred time
5. If it matches the current hour in their timezone, it sends the email
6. Email includes top priority tasks with urgency indicators

## Available Email Functions

The email service (`lib/email/mailer.ts`) provides:

### `sendEmail(options)`
Send a custom email:
```typescript
await sendEmail({
  to: 'user@example.com',
  subject: 'Hello!',
  html: '<p>Email content</p>',
});
```

### `sendDailyDigest(userEmail, userName, priorityTasks)`
Send daily task digest with top priority tasks.

### `sendTaskReminder(userEmail, userName, task)`
Send reminder for a specific task.

## Troubleshooting

### "Invalid login" error
- Make sure you're using an App Password, not your regular password
- Verify 2FA is enabled on your Google account
- Check that the App Password has no spaces

### Emails not sending
- Check Vercel logs for errors
- Verify `SMTP_USER` and `SMTP_PASSWORD` are set in Vercel environment variables
- Make sure users have `emailNotifications: true` in their settings

### Emails going to spam
- Add SPF/DKIM records to your domain (if using custom domain)
- Or: Send from a verified domain email address
- Test with Gmail first, then expand to other providers

## User Settings

Users can control email notifications in their profile:
- **Profile → Notifications → Email Notifications** toggle

The system checks `NotificationSettings.emailNotifications` before sending any emails.
