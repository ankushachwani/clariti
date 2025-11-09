'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');

    try {
      // Sync all integrations
      const syncResponse = await fetch('/api/integrations/sync-all', {
        method: 'POST',
      });

      if (!syncResponse.ok) {
        throw new Error('Sync failed');
      }

      // Then prioritize tasks
      const prioritizeResponse = await fetch('/api/cron/prioritize');
      
      if (prioritizeResponse.ok) {
        setMessage('✓ Synced and prioritized all tasks!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage('✓ Tasks synced! Refreshing...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      setMessage('❌ Sync failed. Please try again.');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
      {message && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {message}
        </span>
      )}
    </div>
  );
}
