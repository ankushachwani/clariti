'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function CleanupButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCleanup = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/tasks/cleanup-duplicates', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Cleaned up ${data.deletedCount || 0} duplicate tasks!`);
        // Refresh the page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to cleanup'}`);
      }
    } catch (error) {
      setMessage('❌ Error: Failed to cleanup duplicates');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleCleanup}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        {isLoading ? 'Cleaning...' : 'Remove Duplicates'}
      </button>
      {message && (
        <p className="text-sm font-medium">{message}</p>
      )}
    </div>
  );
}
