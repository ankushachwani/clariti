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
import confetti from 'canvas-confetti';

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

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'assignment':
        return { label: 'Assignment', icon: '📚', color: 'bg-sky-blue/30 border-sky-blue/50 text-forest-green' };
      case 'announcement':
        return { label: 'Announcement', icon: '📢', color: 'bg-clay-orange/30 border-clay-orange/50 text-forest-green' };
      case 'quiz':
        return { label: 'Quiz', icon: '📝', color: 'bg-moss-green/30 border-moss-green/50 text-forest-green' };
      case 'discussion':
        return { label: 'Discussion', icon: '💬', color: 'bg-sunflower-yellow/30 border-sunflower-yellow/50 text-forest-green' };
      case 'meeting':
        return { label: 'Meeting', icon: '📅', color: 'bg-ocean-teal/30 border-ocean-teal/50 text-forest-green' };
      case 'email':
        return { label: 'Email', icon: '📧', color: 'bg-sunset-coral/30 border-sunset-coral/50 text-forest-green' };
      default:
        return { label: 'Task', icon: '✓', color: 'bg-sage-gray/30 border-sage-gray/50 text-bark-brown' };
    }
  };

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
        // Trigger confetti if task was just completed
        if (!completed) {
          triggerConfetti();
          // Wait a bit for confetti to show before reload
          setTimeout(() => window.location.reload(), 1000);
        } else {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-sunset-coral';
    if (priority >= 5) return 'text-clay-orange';
    return 'text-sunflower-yellow';
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) return 'High';
    if (priority >= 5) return 'Medium';
    return 'Low';
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-cream-white border-2 border-sage-gray/30 rounded-3xl p-12 text-center shadow-md shadow-earth-brown/20">
        <CheckCircle2 className="w-20 h-20 text-moss-green mx-auto mb-4" />
        <h3 className="text-2xl font-bold font-serif text-forest-green mb-2">
          All caught up! 🌿
        </h3>
        <p className="text-bark-brown text-lg">
          No pending tasks. Enjoy your free time!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-cream-white border-2 border-sage-gray/30 rounded-3xl p-8 shadow-md shadow-earth-brown/20 hover:shadow-lg hover:shadow-earth-brown/30 transition-all duration-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage-gray/5"></div>
      <div className="relative z-10">
        <h2 className="text-2xl font-bold font-serif text-forest-green mb-2 flex items-center">
          <span className="mr-2">🎯</span> Top Priority Tasks
        </h2>
        <p className="text-sm text-bark-brown mb-6 font-medium">
          Prioritized by AI based on deadlines and importance
        </p>

        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="border-2 border-sage-gray/30 rounded-2xl p-5 bg-stone-beige/50 hover:bg-stone-beige hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start space-x-3">
                {/* Priority Number */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-forest-green to-moss-green text-cream-white flex items-center justify-center font-bold text-sm shadow-md">
                  {index + 1}
                </div>

              <button
                onClick={() => handleToggleComplete(task.id, task.completed)}
                className="mt-1 flex-shrink-0"
              >
                {task.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-moss-green" />
                ) : (
                  <Circle className="w-6 h-6 text-sage-gray hover:text-forest-green transition-colors" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold font-serif ${
                        task.completed
                          ? 'line-through text-sage-gray'
                          : 'text-forest-green'
                      }`}
                    >
                      {task.title}
                    </h3>
                    {task.course && (
                      <p className="text-sm text-bark-brown mt-1 font-medium">
                        📚 {task.course}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border-2 ${
                        task.priority >= 8
                          ? 'bg-sunset-coral/20 border-sunset-coral text-sunset-coral'
                          : task.priority >= 5
                          ? 'bg-clay-orange/20 border-clay-orange text-clay-orange'
                          : 'bg-sunflower-yellow/20 border-sunflower-yellow text-earth-brown'
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
                  <span className={`text-xs px-2 py-1 rounded font-medium ${getCategoryBadge(task.category).color}`}>
                    {getCategoryBadge(task.category).icon} {getCategoryBadge(task.category).label}
                  </span>
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
