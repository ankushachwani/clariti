import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import CalendarView from '@/components/calendar/CalendarView';

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      tasks: {
        where: {
          dueDate: {
            not: null,
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      },
    },
  });

  if (!user) {
    redirect('/');
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Calendar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View your tasks and deadlines in calendar format
          </p>
        </div>

        <CalendarView tasks={user.tasks} />
      </main>
    </>
  );
}
