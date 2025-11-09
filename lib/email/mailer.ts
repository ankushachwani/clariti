import nodemailer from 'nodemailer';

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD, // This should be an App Password, not your regular Gmail password
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Gmail SMTP
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"Clariti" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send daily digest email with priority tasks
 */
export async function sendDailyDigest(
  userEmail: string,
  userName: string,
  priorityTasks: any[]
) {
  const tasksHtml = priorityTasks
    .slice(0, 5) // Top 5 tasks
    .map(
      (task, index) => `
    <div style="margin-bottom: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px;">
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: bold; color: #4f46e5; margin-right: 8px;">#${index + 1}</span>
        <span style="font-weight: 600; color: #1f2937;">${task.title}</span>
      </div>
      ${task.description ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${task.description}</p>` : ''}
      ${task.dueDate ? `<p style="margin: 4px 0; color: #ef4444; font-size: 13px;">📅 Due: ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
    </div>
  `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily Clariti Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px;">✨ Clariti Daily Digest</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your priorities for today</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">Hi ${userName || 'there'} 👋</p>
      
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280;">
        Here are your top priority tasks for today. Let's make it a productive day!
      </p>

      <!-- Priority Tasks -->
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">🎯 Top Priorities</h2>
        ${tasksHtml}
      </div>

      ${
        priorityTasks.length > 5
          ? `<p style="margin: 16px 0; font-size: 14px; color: #6b7280; text-align: center;">+ ${priorityTasks.length - 5} more tasks</p>`
          : ''
      }

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" 
           style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
          View All Tasks
        </a>
      </div>

      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #9ca3af;">
          You're receiving this because you enabled daily digest emails in your Clariti settings.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">
          <a href="${process.env.NEXTAUTH_URL}/profile" style="color: #667eea; text-decoration: none;">Manage notification settings</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: userEmail,
    subject: `✨ Your Clariti Daily Digest - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
    html,
  });
}

/**
 * Send task reminder email
 */
export async function sendTaskReminder(
  userEmail: string,
  userName: string,
  task: any
) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const urgencyColor = daysUntilDue !== null && daysUntilDue <= 1 ? '#ef4444' : '#f59e0b';
  const urgencyText =
    daysUntilDue !== null
      ? daysUntilDue === 0
        ? 'Due TODAY'
        : daysUntilDue === 1
          ? 'Due TOMORROW'
          : `Due in ${daysUntilDue} days`
      : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #111827;">⏰ Task Reminder</h1>
      
      ${urgencyText ? `<div style="display: inline-block; padding: 6px 12px; background: ${urgencyColor}; color: white; border-radius: 6px; font-size: 13px; font-weight: 600; margin-bottom: 20px;">${urgencyText}</div>` : ''}
      
      <p style="margin: 20px 0 8px 0; font-size: 16px; color: #374151;">Hi ${userName || 'there'} 👋</p>
      
      <div style="margin: 24px 0; padding: 20px; background: #f3f4f6; border-left: 4px solid #667eea; border-radius: 8px;">
        <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">${task.title}</h2>
        ${task.description ? `<p style="margin: 8px 0; color: #6b7280; font-size: 15px;">${task.description}</p>` : ''}
        ${dueDate ? `<p style="margin: 12px 0 0 0; color: #ef4444; font-size: 14px; font-weight: 600;">📅 Due: ${dueDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>` : ''}
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/tasks" 
           style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
          View Task
        </a>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #9ca3af;">
          <a href="${process.env.NEXTAUTH_URL}/profile" style="color: #667eea; text-decoration: none;">Manage notification settings</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: userEmail,
    subject: `⏰ Reminder: ${task.title}`,
    html,
  });
}
