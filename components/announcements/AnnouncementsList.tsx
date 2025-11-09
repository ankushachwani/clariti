'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

interface AnnouncementsListProps {
  announcements: any[];
}

export default function AnnouncementsList({ announcements: initialAnnouncements }: AnnouncementsListProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [showRead, setShowRead] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const stripHtml = (html: string): string => {
    if (!html) return '';
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    const textarea = document.createElement('textarea');
    textarea.innerHTML = withoutTags;
    return textarea.value.replace(/\s+/g, ' ').trim();
  };

  const handleToggleRead = async (announcementId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${announcementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (response.ok) {
        const updatedAnnouncement = await response.json();
        setAnnouncements((prev) =>
          prev.map((ann) => (ann.id === announcementId ? updatedAnnouncement : ann))
        );
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/sync-all', {
        method: 'POST',
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  const unreadAnnouncements = announcements.filter(a => !a.completed);
  const readAnnouncements = announcements.filter(a => a.completed);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{unreadAnnouncements.length}</span> unread
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRead}
                onChange={(e) => setShowRead(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show read
              </span>
            </label>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Unread Announcements */}
      {unreadAnnouncements.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Unread ({unreadAnnouncements.length})
          </h2>

          <div className="space-y-3">
            {unreadAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleRead(announcement.id, announcement.completed)}
                    className="mt-1 flex-shrink-0"
                  >
                    <Circle className="w-5 h-5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      {announcement.title.replace('📢 ', '')}
                    </h3>
                    {announcement.course && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
                        {announcement.course}
                      </p>
                    )}
                    {announcement.description && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-3">
                        {stripHtml(announcement.description)}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                      {announcement.metadata?.postedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Posted {format(new Date(announcement.metadata.postedAt), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded font-medium">
                        📢 Announcement
                      </span>
                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {announcement.source}
                      </span>
                      {announcement.sourceUrl && (
                        <a
                          href={announcement.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View on Canvas
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Read Announcements */}
      {showRead && readAnnouncements.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            Read ({readAnnouncements.length})
          </h2>

          <div className="space-y-3">
            {readAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleRead(announcement.id, announcement.completed)}
                    className="mt-1 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">
                      {announcement.title.replace('📢 ', '')}
                    </h3>
                    {announcement.course && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {announcement.course}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                      {announcement.metadata?.postedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Posted {format(new Date(announcement.metadata.postedAt), 'MMM d, yyyy')}
                        </span>
                      )}
                      {announcement.sourceUrl && (
                        <a
                          href={announcement.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View source
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {unreadAnnouncements.length === 0 && (!showRead || readAnnouncements.length === 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="text-6xl mb-4">📢</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No announcements yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Course announcements from Canvas will appear here
          </p>
        </div>
      )}
    </div>
  );
}
