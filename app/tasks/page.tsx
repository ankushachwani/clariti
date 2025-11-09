import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import TasksList from '@/components/tasks/TasksList';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      tasks: {
        where: {
          category: {
            not: 'announcement', // Exclude announcements from tasks page
          },
        },
        orderBy: [{ completed: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }],
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
              <span className="mr-3">✓</span> All Tasks
            </h1>
            <p className="text-bark-brown mt-2 text-lg">
              View and manage all your tasks from connected integrations
            </p>
          </div>

          <TasksList tasks={user.tasks} />
        </div>
      </main>
    </>
  );
}
