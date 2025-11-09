'use client';

import { useState } from 'react';
import { User } from 'lucide-react';

interface ProfileSettingsProps {
  user: any;
}

export default function ProfileSettings({ user: initialUser }: ProfileSettingsProps) {
  const [user, setUser] = useState(initialUser);
  const [saving, setSaving] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      academicYear: formData.get('academicYear') as string,
      timezone: formData.get('timezone') as string,
    };

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-cream-white rounded-3xl shadow-md shadow-earth-brown/20 border-2 border-sage-gray/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-7 h-7 text-forest-green" />
        <h2 className="text-2xl font-bold font-serif text-forest-green">
          Profile Information
        </h2>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bark-brown mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={user.name || ''}
              className="w-full px-4 py-2 border-2 border-sage-gray/30 rounded-2xl bg-stone-beige/30 text-bark-brown focus:ring-2 focus:ring-forest-green focus:border-forest-green transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bark-brown mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2 border-2 border-sage-gray/30 rounded-2xl bg-sage-gray/20 text-sage-gray cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bark-brown mb-1">
              Academic Year
            </label>
            <select
              name="academicYear"
              defaultValue={user.academicYear || ''}
              className="w-full px-4 py-2 border-2 border-sage-gray/30 rounded-2xl bg-stone-beige/30 text-bark-brown focus:ring-2 focus:ring-forest-green focus:border-forest-green transition-all"
            >
              <option value="">Select year</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Graduate">Graduate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-bark-brown mb-1">
              Timezone
            </label>
            <select
              name="timezone"
              defaultValue={user.timezone}
              className="w-full px-4 py-2 border-2 border-sage-gray/30 rounded-2xl bg-stone-beige/30 text-bark-brown focus:ring-2 focus:ring-forest-green focus:border-forest-green transition-all"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t-2 border-sage-gray/30">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-br from-forest-green to-moss-green text-cream-white text-sm font-medium rounded-full hover:shadow-lg hover:scale-105 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
