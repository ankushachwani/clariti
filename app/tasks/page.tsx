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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            All Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage all your tasks from connected integrations
          </p>
        </div>

        <TasksList tasks={user.tasks} />
      </main>
    </>
  );
}
