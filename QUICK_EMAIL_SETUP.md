# Quick Setup Guide - Email Notifications

## ✅ What's Been Set Up

1. **Gmail SMTP Email Service** - Beautiful HTML emails
2. **Test Email Button** - In Profile → Notifications
3. **User-Controlled Settings** - Users pick their own time
4. **Enhanced Email Template** - Priority indicators, stats, motivational quotes

## 🚀 To Complete Setup:

### 1. Add SMTP Credentials to Vercel

Go to: https://vercel.com/ankushachwani/clariti/settings/environment-variables

Add these two variables:

```
SMTP_USER = ankushachwani@gmail.com
SMTP_PASSWORD = espfbneryztkkwew
```

(Remove spaces from password: `espfbneryztkkwew`)

### 2. Redeploy on Vercel

After adding the environment variables, trigger a redeploy or just push any commit.

### 3. Test It!

1. Go to **Profile → Notifications**
2. Make sure **Daily Brief** and **Email Notifications** are both enabled
3. Set your preferred time (e.g., 8:00 AM)
4. Click **"Send Test"** button
5. Check your email inbox (ankushachwani@gmail.com)

## 📧 Email Features

Your daily debrief email includes:

✨ **Beautiful Design**
- Gradient header with date
- Priority-coded tasks (High/Medium/Low)
- Urgency indicators (Due TODAY, Tomorrow, Overdue)
- Task stats summary (Urgent, This Week, Total)
- Motivational quote
- Direct links to dashboard

🎯 **Smart Content**
- Top 5 priority tasks shown in detail
- Remaining task count displayed
- Color-coded by priority and urgency
- Course names and due dates
- Customized greeting with user's name

⏰ **User Control**
- Pick any time (stored as HH:mm format like "08:00")
- Respects user's timezone (stored in User.timezone)
- Only sends if both Daily Brief + Email Notifications are enabled
- Can disable anytime

## 🔧 How the Cron Works

The cron job at `/api/cron/daily-digest`:
1. Runs **every hour** (`0 * * * *` schedule)
2. Checks ALL users with email notifications enabled
3. For each user, calculates their local time based on timezone
4. If current hour matches their preferred hour → sends email
5. Skips users with no tasks or wrong time

## 📝 Cron Schedule (vercel.json)

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

## 🧪 Manual Testing

Test the cron endpoint directly:

```bash
curl -H "Authorization: Bearer LHfsOfd+GYX5YGdE+lAQavZDiuOXYbjfMXxEc+TdGcI=" \
  https://clariti-ten.vercel.app/api/cron/daily-digest
```

Or test email from UI:
1. Go to Profile → Notifications
2. Click "Send Test" button
3. Check response message

## 🎨 Email Subject

```
✨ Here's your Clariti daily debrief - Monday, November 9, 2025
```

The subject line includes the day and date for easy inbox organization.

## ✅ Done!

Once SMTP credentials are in Vercel, everything will work automatically. Users control their own email preferences and times!
