import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import { getGreeting } from '@/lib/utils/date-utils';
import { generateDailyMotivation } from '@/lib/ai/cohere';
import DailyBrief from '@/components/dashboard/DailyBrief';
import PriorityTasks from '@/components/dashboard/PriorityTasks';
import Navbar from '@/components/layout/Navbar';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      tasks: {
        where: {
          completed: false,
        },
        orderBy: {
          priority: 'desc',
        },
        take: 10,
      },
    },
  });

  if (!user) {
    redirect('/');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasksDueToday = await prisma.task.findMany({
    where: {
      userId: user.id,
      dueDate: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const tasksCompletedToday = await prisma.task.findMany({
    where: {
      userId: user.id,
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {greeting}, {user.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-lg text-blue-600 dark:text-blue-400 font-semibold mt-1">
            {motivationalMessage}
          </p>
        </div>

        <DailyBrief
          tasksDueToday={tasksDueToday.length}
          tasksCompletedToday={tasksCompletedToday.length}
          completionPercentage={completionPercentage}
        />

        <PriorityTasks tasks={user.tasks} />
      </main>
    </>
  );
}
