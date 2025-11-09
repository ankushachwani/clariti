import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import AnnouncementsList from '@/components/announcements/AnnouncementsList';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      tasks: {
        where: {
          category: 'announcement',
        },
        orderBy: [
          { completed: 'asc' },
          { createdAt: 'desc' },
        ],
      },
    },
  });

  if (!user) {
    redirect('/');
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#FFF8DC] dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              📢 Announcements
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Course announcements and important updates from your classes
            </p>
          </div>

          <AnnouncementsList announcements={user.tasks} />
        </div>
      </main>
    </>
  );
}
