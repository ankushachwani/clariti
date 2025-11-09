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
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Categorize tasks
  const urgentTasks = priorityTasks.filter((task) => {
    if (!task.dueDate) return false;
    const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 1;
  });

  const upcomingTasks = priorityTasks.filter((task) => {
    if (!task.dueDate) return false;
    const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 1 && daysUntilDue <= 7;
  });

  const otherTasks = priorityTasks.filter((task) => !urgentTasks.includes(task) && !upcomingTasks.includes(task));

  const topTasks = priorityTasks.slice(0, 5);

  const tasksHtml = topTasks
    .map((task, index) => {
      const priority = task.priority || 0;
      const priorityColor = priority >= 8 ? '#ef4444' : priority >= 5 ? '#f59e0b' : '#10b981';
      const priorityLabel = priority >= 8 ? 'High' : priority >= 5 ? 'Medium' : 'Low';
      
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      
      let dueDateHtml = '';
      if (dueDate) {
        const dateFormatted = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (daysUntilDue !== null) {
          if (daysUntilDue === 0) {
            dueDateHtml = `<span style="color: #ef4444; font-weight: 600;">📅 Due TODAY</span>`;
          } else if (daysUntilDue === 1) {
            dueDateHtml = `<span style="color: #f59e0b; font-weight: 600;">📅 Due Tomorrow (${dateFormatted})</span>`;
          } else if (daysUntilDue < 0) {
            dueDateHtml = `<span style="color: #dc2626; font-weight: 600;">⚠️ OVERDUE (${dateFormatted})</span>`;
          } else {
            dueDateHtml = `<span style="color: #6b7280;">📅 Due ${dateFormatted} (${daysUntilDue}d)</span>`;
          }
        }
      }

      return `
    <div style="margin-bottom: 12px; padding: 18px; background: white; border-radius: 8px; border-left: 4px solid ${priorityColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="margin-bottom: 8px;">
        <span style="font-size: 16px; font-weight: bold; color: ${priorityColor}; margin-right: 8px;">#${index + 1}</span>
        <span style="font-weight: 600; color: #1f2937; font-size: 16px;">${task.title}</span>
      </div>
      ${task.description ? `<p style="margin: 8px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${task.description.substring(0, 150)}${task.description.length > 150 ? '...' : ''}</p>` : ''}
      <div style="margin-top: 8px;">
        ${dueDateHtml ? `<div style="margin-bottom: 4px; font-size: 13px;">${dueDateHtml}</div>` : ''}
        ${task.course ? `<div style="color: #6b7280; font-size: 12px;">📚 ${task.course}</div>` : ''}
      </div>
    </div>
  `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily Clariti Debrief</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative; overflow: hidden;">
      <div style="position: relative; z-index: 1;">
        <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">✨ Daily Clariti Debrief</h1>
        <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 500;">${dayName}, ${dateStr}</p>
      </div>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
      <!-- Greeting -->
      <div style="margin-bottom: 30px;">
        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 600;">Good morning, ${userName || 'there'} 👋</p>
        <p style="margin: 12px 0 0 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
          ${urgentTasks.length > 0 
            ? `You have <strong style="color: #ef4444;">${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's' : ''}</strong> today. Let's tackle them first!` 
            : `You have <strong>${priorityTasks.length} task${priorityTasks.length > 1 ? 's' : ''}</strong> to work on. Let's make today productive! 🚀`
          }
        </p>
      </div>

      <!-- Priority Tasks -->
      <div style="margin-bottom: 30px;">
        <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #111827; font-weight: 700; display: flex; align-items: center;">
          🎯 Your Top Priorities
        </h2>
        ${tasksHtml}
      </div>

      ${priorityTasks.length > 5 
        ? `<div style="text-align: center; padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 15px; color: #6b7280;">
              <strong style="color: #4f46e5;">+ ${priorityTasks.length - 5} more task${priorityTasks.length - 5 > 1 ? 's' : ''}</strong> waiting for you
            </p>
          </div>` 
        : ''
      }

      <!-- Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); border-radius: 12px;">
        ${urgentTasks.length > 0 
          ? `<div style="text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #ef4444;">${urgentTasks.length}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Urgent</div>
            </div>` 
          : ''
        }
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #3b82f6;">${upcomingTasks.length}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">This Week</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #8b5cf6;">${priorityTasks.length}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Total</div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" 
           style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
          Open Clariti Dashboard →
        </a>
      </div>

      <!-- Motivational Quote -->
      <div style="margin-top: 32px; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #92400e; font-style: italic; line-height: 1.6;">
          💡 "Success is the sum of small efforts repeated day in and day out." - Robert Collier
        </p>
      </div>

      <!-- Footer -->
      <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
          You're receiving this because you enabled daily brief emails in your Clariti settings.
        </p>
        <p style="margin: 12px 0 0 0; font-size: 13px;">
          <a href="${process.env.NEXTAUTH_URL}/profile" style="color: #667eea; text-decoration: none; font-weight: 500;">Manage notification settings</a>
          <span style="color: #d1d5db; margin: 0 8px;">•</span>
          <a href="${process.env.NEXTAUTH_URL}/tasks" style="color: #667eea; text-decoration: none; font-weight: 500;">View all tasks</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: userEmail,
    subject: `✨ Here's your Clariti daily debrief - ${dayName}, ${dateStr}`,
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
