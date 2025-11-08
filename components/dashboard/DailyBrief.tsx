'use client';

import { CheckCircle2, Clock, TrendingUp } from 'lucide-react';

interface DailyBriefProps {
  tasksDueToday: number;
  tasksCompletedToday: number;
  completionPercentage: number;
}

export default function DailyBrief({
  tasksDueToday,
  tasksCompletedToday,
  completionPercentage,
}: DailyBriefProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Daily Snapshot
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tasks Due Today */}
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Due Today</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {tasksDueToday}
            </p>
          </div>
        </div>

        {/* Tasks Completed Today */}
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Completed Today
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {tasksCompletedToday}
            </p>
          </div>
        </div>

        {/* Completion Percentage */}
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Completion Rate
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {completionPercentage}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {tasksDueToday > 0 && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Today's Progress</span>
            <span>
              {tasksCompletedToday} / {tasksDueToday} tasks
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
