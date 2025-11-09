import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import { getGreeting } from '@/lib/utils/date-utils';
import { generateDailyMotivation, generateWorkRoadmap } from '@/lib/ai/cohere';
import DailyBrief from '@/components/dashboard/DailyBrief';
import PriorityTasks from '@/components/dashboard/PriorityTasks';
import SyncButton from '@/components/dashboard/SyncButton';
import Chatbot from '@/components/dashboard/Chatbot';
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

  // Get user's local date using their timezone
  const userNow = new Date().toLocaleString('en-US', { 
    timeZone: user.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the localized date string to get today's date in user's timezone
  const [datePart] = userNow.split(', ');
  const [month, day, year] = datePart.split('/');
  const today = new Date(`${year}-${month}-${day}T00:00:00`);
  const tomorrow = new Date(`${year}-${month}-${day}T23:59:59`);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log('Dashboard Debug:', {
    userTimezone: user.timezone,
    userNow,
    todayRange: { start: today.toISOString(), end: tomorrow.toISOString() }
  });

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

  console.log('Tasks found:', {
    dueToday: tasksDueToday.length,
    dueTodayTasks: tasksDueToday.map(t => ({
      title: t.title,
      dueDate: t.dueDate?.toISOString(),
      category: t.category
    }))
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
      <main className="min-h-screen bg-gradient-to-br from-cream-white via-stone-beige to-sage-gray/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold font-serif text-forest-green">
                {greeting}, {user.name?.split(' ')[0] || 'there'}! 🌱
              </h1>
              <p className="text-lg text-moss-green font-medium mt-2" suppressHydrationWarning>
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

          {/* AI Roadmap Summary - BarkCard style */}
          <div className="bg-cream-white border-2 border-sage-gray/30 rounded-3xl p-8 mb-8 shadow-md shadow-earth-brown/20 hover:shadow-lg hover:shadow-earth-brown/30 transition-all duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage-gray/5"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold font-serif text-forest-green mb-4 flex items-center">
                <span className="mr-3 text-3xl">🎯</span>
                Your Roadmap for Success
              </h2>
              <p className="text-bark-brown leading-relaxed text-lg" suppressHydrationWarning>
                {roadmap}
              </p>
            </div>
          </div>

          <PriorityTasks tasks={priorityTasks} />

          {/* AI Chatbot */}
          <div className="mt-8">
            <Chatbot />
          </div>
        </div>
      </main>
    </>
  );
}
