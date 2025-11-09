import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import { getGreeting } from '@/lib/utils/date-utils';
import { generateDailyMotivation, generateWorkRoadmap } from '@/lib/ai/cohere';
import DailyBrief from '@/components/dashboard/DailyBrief';
import PriorityTasks from '@/components/dashboard/PriorityTasks';
import SyncButton from '@/components/dashboard/SyncButton';
import Navbar from '@/components/layout/Navbar';

export const revalidate = 0; // Disable caching for real-time data
export const dynamic = 'force-dynamic'; // Force dynamic rendering

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user) {
    redirect('/');
  }

  // Get priority tasks (top 10, sorted by priority and urgency)
  const now = new Date();
  const priorityTasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      completed: false,
      category: {
        not: 'announcement', // Exclude announcements from priority tasks
      },
      dueDate: {
        gte: now,
      },
    },
    orderBy: [
      { priority: 'desc' },
      { urgencyScore: 'desc' },
      { dueDate: 'asc' },
    ],
    take: 10,
  });

  // Generate AI roadmap for top 5 tasks
  const roadmap = await generateWorkRoadmap(priorityTasks.slice(0, 5));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasksDueToday = await prisma.task.findMany({
    where: {
      userId: user.id,
      category: {
        not: 'announcement',
      },
      dueDate: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const tasksCompletedToday = await prisma.task.findMany({
    where: {
      userId: user.id,
      category: {
        not: 'announcement',
      },
      completedAt: {
        gte: today,
        lt: tomorrow,
      },
      completed: true,
    },
  });

  const greeting = getGreeting(user.timezone);
  const motivationalMessage = await generateDailyMotivation();
  const completionPercentage =
    tasksDueToday.length > 0
      ? Math.round((tasksCompletedToday.length / tasksDueToday.length) * 100)
      : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {greeting}, {user.name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-lg text-blue-600 dark:text-blue-400 font-semibold mt-1">
              {motivationalMessage}
            </p>
          </div>
          <SyncButton />
        </div>

        <DailyBrief
          tasksDueToday={tasksDueToday.length}
          tasksCompletedToday={tasksCompletedToday.length}
          completionPercentage={completionPercentage}
        />

        {/* AI Roadmap Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 mb-8 border border-blue-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <span className="mr-2">🎯</span>
            Your Roadmap for Success
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {roadmap}
          </p>
        </div>

        <PriorityTasks tasks={priorityTasks} />
      </main>
    </>
  );
}
