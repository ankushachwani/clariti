'use client';

import { CheckCircle2, Clock } from 'lucide-react';
import OrganicCard from '@/components/shared/OrganicCard';

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
    <OrganicCard className="bg-cream-white border-2 border-sage-gray/30 rounded-3xl p-8 mb-8 shadow-md shadow-earth-brown/20 hover:shadow-lg hover:shadow-earth-brown/30 transition-all duration-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage-gray/5"></div>
      <div className="relative z-10">
        <h2 className="text-2xl font-bold font-serif text-forest-green mb-6 flex items-center">
          <span className="mr-2">📊</span> Daily Snapshot
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasks Due Today */}
          <div className="flex items-start space-x-3 bg-sky-blue/20 p-4 rounded-2xl border border-sky-blue/30 hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-sky-blue/40 rounded-full">
              <Clock className="w-6 h-6 text-forest-green" />
            </div>
            <div>
              <p className="text-sm text-bark-brown font-medium">Due Today</p>
              <p className="text-3xl font-bold font-serif text-forest-green">
                {tasksDueToday}
              </p>
            </div>
          </div>

          {/* Tasks Completed Today */}
          <div className="flex items-start space-x-3 bg-moss-green/20 p-4 rounded-2xl border border-moss-green/30 hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-moss-green/40 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-forest-green" />
            </div>
            <div>
              <p className="text-sm text-bark-brown font-medium">
                Completed Today
              </p>
              <p className="text-3xl font-bold font-serif text-forest-green">
                {tasksCompletedToday}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {tasksDueToday > 0 && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-bark-brown font-medium mb-2">
              <span>Today's Progress</span>
              <span>
                {tasksCompletedToday} / {tasksDueToday} tasks
              </span>
            </div>
            <div className="w-full bg-sage-gray/30 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-forest-green via-moss-green to-ocean-teal h-4 rounded-full transition-all duration-500 shadow-inner"
                style={{ width: `${completionPercentage}%` }}
              />
          </div>
        </div>
      )}
      </div>
    </OrganicCard>
  );
}
