'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types';
import {
  formatDueDate,
  getUrgencyLabel,
  isOverdue,
  isDueToday,
  isDueThisWeek,
} from '@/lib/utils/date-utils';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  AlertCircle,
  Filter,
  Plus,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TasksListProps {
  tasks: any[];
}

type FilterType = 'all' | 'high' | 'today' | 'week' | 'overdue';

export default function TasksList({ tasks: initialTasks }: TasksListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCompleted, setShowCompleted] = useState(true); // Show completed by default
  const [syncing, setSyncing] = useState(false);

  const stripHtml = (html: string): string => {
    // Remove HTML tags
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = withoutTags;
    // Clean up extra whitespace
    return textarea.value.replace(/\s+/g, ' ').trim();
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Apply completion filter
    if (!showCompleted) {
      filtered = filtered.filter((task) => !task.completed);
    }

    // Apply priority/date filters
    switch (filter) {
      case 'high':
        filtered = filtered.filter((task) => task.priority >= 7);
        break;
      case 'today':
        filtered = filtered.filter((task) =>
          task.dueDate ? isDueToday(new Date(task.dueDate)) : false
        );
        break;
      case 'week':
        filtered = filtered.filter((task) =>
          task.dueDate ? isDueThisWeek(new Date(task.dueDate)) : false
        );
        break;
      case 'overdue':
        filtered = filtered.filter((task) =>
          task.dueDate && !task.completed ? isOverdue(new Date(task.dueDate)) : false
        );
        break;
      default:
        break;
    }

    return filtered;
  }, [tasks, filter, showCompleted]);

  // Separate completed and upcoming tasks for better organization
  const upcomingTasks = filteredTasks.filter(task => !task.completed);
  const completedTasks = filteredTasks.filter(task => task.completed);
  
  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? updatedTask : task))
        );
        
        // Trigger confetti if task was just completed
        if (!completed && updatedTask.completed) {
          triggerConfetti();
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/sync', {
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

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) return { label: 'High', color: 'red' };
    if (priority >= 5) return { label: 'Medium', color: 'orange' };
    return { label: 'Low', color: 'yellow' };
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
            {[
              { value: 'all', label: 'All' },
              { value: 'high', label: 'High Priority' },
              { value: 'today', label: 'Due Today' },
              { value: 'week', label: 'This Week' },
              { value: 'overdue', label: 'Overdue' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as FilterType)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  filter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show completed
              </span>
            </label>

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
      </div>

      {/* Tasks List */}
      <div className="space-y-6">
        {/* Progress Summary */}
        {totalCount > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Overall Progress
              </h3>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round((completedCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {completedCount} of {totalCount} tasks completed
            </p>
          </div>
        )}

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upcoming Tasks ({upcomingTasks.length})
              </h2>
            </div>

            <div className="space-y-3">
              {upcomingTasks.map((task) => {
                const priority = getPriorityBadge(task.priority);
                return (
                  <div
                    key={task.id}
                    className="border rounded-lg p-4 transition-colors border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleComplete(task.id, task.completed)}
                        className="mt-1 flex-shrink-0"
                      >
                        <Circle className="w-5 h-5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white">
                              {task.title}
                            </h3>
                            {task.course && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {task.course}
                              </p>
                            )}
                            {task.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                {stripHtml(task.description)}
                              </p>
                            )}
                          </div>

                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                              priority.color === 'red'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : priority.color === 'orange'
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            }`}
                          >
                            {priority.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-600 dark:text-gray-400">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {getUrgencyLabel(new Date(task.dueDate))}
                            </span>
                          )}
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {task.source}
                          </span>
                          {task.sourceUrl && (
                            <a
                              href={task.sourceUrl}
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
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {showCompleted && completedTasks.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                Completed Tasks ({completedTasks.length})
              </h2>
            </div>

            <div className="space-y-3">
              {completedTasks.map((task) => {
                const priority = getPriorityBadge(task.priority);
                return (
                  <div
                    key={task.id}
                    className="border rounded-lg p-4 transition-colors border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleComplete(task.id, task.completed)}
                        className="mt-1 flex-shrink-0"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="text-base font-medium line-through text-gray-400 dark:text-gray-600">
                              {task.title}
                            </h3>
                            {task.course && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {task.course}
                              </p>
                            )}
                            {task.completedAt && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                ✓ Completed {new Date(task.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap opacity-60 ${
                              priority.color === 'red'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : priority.color === 'orange'
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            }`}
                          >
                            {priority.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {task.source}
                          </span>
                          {task.sourceUrl && (
                            <a
                              href={task.sourceUrl}
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
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
}
