'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { formatDueDate, getUrgencyLabel } from '@/lib/utils/date-utils';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface PriorityTasksProps {
  tasks: any[];
}

export default function PriorityTasks({ tasks }: PriorityTasksProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const stripHtml = (html: string): string => {
    // Remove HTML tags
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = withoutTags;
    // Clean up extra whitespace
    return textarea.value.replace(/\s+/g, ' ').trim();
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 dark:text-red-400';
    if (priority >= 5) return 'text-orange-600 dark:text-orange-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) return 'High';
    if (priority >= 5) return 'Medium';
    return 'Low';
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          All caught up!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          No pending tasks. Enjoy your free time!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        📌 Top Priority Tasks
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Prioritized by AI based on deadlines and importance
      </p>

      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start space-x-3">
              {/* Priority Number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>

              <button
                onClick={() => handleToggleComplete(task.id, task.completed)}
                className="mt-1 flex-shrink-0"
              >
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3
                      className={`text-base font-medium ${
                        task.completed
                          ? 'line-through text-gray-400 dark:text-gray-600'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h3>
                    {task.course && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {task.course}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        task.priority >= 8
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : task.priority >= 5
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}
                    >
                      {getPriorityBadge(task.priority)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {getUrgencyLabel(new Date(task.dueDate))}
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {task.source}
                  </span>
                </div>

                {expandedTask === task.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {task.aiSummary && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                          AI Insight:
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                          {task.aiSummary}
                        </p>
                      </div>
                    )}
                    {task.description && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {stripHtml(task.description).substring(0, 300)}
                          {stripHtml(task.description).length > 300 ? '...' : ''}
                        </p>
                      </div>
                    )}
                    {task.sourceUrl && (
                      <a
                        href={task.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Original on {task.source === 'canvas' ? 'Canvas' : task.source}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                <button
                  onClick={() =>
                    setExpandedTask(expandedTask === task.id ? null : task.id)
                  }
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {expandedTask === task.id ? (
                    <>
                      Show less <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      View details <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
