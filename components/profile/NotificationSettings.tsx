'use client';

import { useState } from 'react';
import { Bell, Mail, Send } from 'lucide-react';

interface NotificationSettingsProps {
  settings: any;
}

export default function NotificationSettings({ settings: initialSettings }: NotificationSettingsProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggle = async (key: string, value: boolean) => {
    setSettings({ ...settings, [key]: value });

    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setSettings(settings); // Revert on error
    }
  };

  const handleTimeChange = async (time: string) => {
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyBriefTime: time }),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
      }
    } catch (error) {
      console.error('Error updating daily brief time:', error);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setTestEmailMessage(null);

    try {
      const response = await fetch('/api/user/test-email', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setTestEmailMessage({ type: 'success', text: '✓ Test email sent! Check your inbox.' });
      } else {
        setTestEmailMessage({ type: 'error', text: data.error || 'Failed to send test email' });
      }
    } catch (error) {
      setTestEmailMessage({ type: 'error', text: 'Failed to send test email. Please try again.' });
    } finally {
      setSendingTest(false);
      // Clear message after 5 seconds
      setTimeout(() => setTestEmailMessage(null), 5000);
    }
  };

  return (
    <div className="bg-cream-white border-2 border-sage-gray/30 rounded-3xl p-8 shadow-md shadow-earth-brown/20 hover:shadow-lg hover:shadow-earth-brown/30 transition-all duration-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage-gray/5"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-7 h-7 text-forest-green" />
          <h2 className="text-2xl font-bold font-serif text-forest-green">
            Notification Preferences
          </h2>
        </div>

        {/* Test Email Button - Prominent at the top */}
        <div className="mb-6 p-5 bg-gradient-to-r from-moss-green/20 to-ocean-teal/20 border-2 border-moss-green/40 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <Mail className="w-7 h-7 text-forest-green mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold font-serif text-forest-green">
                  Test Daily Debrief Email
                </h3>
                <p className="text-sm text-bark-brown mt-1 font-medium">
                  Send yourself a preview email with your actual tasks
                </p>
              </div>
            </div>
          <button
            onClick={handleSendTestEmail}
            disabled={sendingTest}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-forest-green to-moss-green hover:shadow-xl hover:scale-105 disabled:bg-sage-gray disabled:cursor-not-allowed text-cream-white rounded-full text-sm font-bold transition-all shadow-md whitespace-nowrap"
          >
            {sendingTest ? (
              <>
                <div className="w-4 h-4 border-2 border-cream-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Test
              </>
            )}
          </button>
        </div>
        
        {/* Test Email Message */}
        {testEmailMessage && (
          <div className={`mt-3 p-3 rounded-2xl text-sm font-semibold ${
            testEmailMessage.type === 'success' 
              ? 'bg-moss-green/30 text-forest-green border-2 border-moss-green'
              : 'bg-sunset-coral/30 text-sunset-coral border-2 border-sunset-coral'
          }`}>
            {testEmailMessage.text}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Daily Brief */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Daily Brief
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Receive a daily summary of your tasks and priorities
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.dailyBrief ?? true}
              onChange={(e) => handleToggle('dailyBrief', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Daily Brief Time */}
        {settings?.dailyBrief && (
          <div className="ml-4 flex items-center justify-between py-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Daily Brief Time
            </label>
            <input
              type="time"
              value={settings?.dailyBriefTime ?? '08:00'}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Assignment Reminders */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Assignment Reminders
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Get notified about upcoming assignment deadlines
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.assignmentReminders ?? true}
              onChange={(e) => handleToggle('assignmentReminders', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Email Notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Receive notifications via email
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.emailNotifications ?? true}
              onChange={(e) => handleToggle('emailNotifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
    </div>
  );
}
