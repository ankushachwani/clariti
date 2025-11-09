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
      <main className="min-h-screen bg-gradient-to-br from-cream-white via-stone-beige to-sage-gray/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold font-serif text-forest-green flex items-center">
              <span className="mr-3">📅</span> Calendar
            </h1>
            <p className="text-bark-brown mt-2 text-lg">
              View your tasks and deadlines in calendar format
            </p>
          </div>

          <CalendarView tasks={user.tasks} />
        </div>
      </main>
    </>
  );
}
