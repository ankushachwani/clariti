import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import ProfileSettings from '@/components/profile/ProfileSettings';
import IntegrationsPanel from '@/components/profile/IntegrationsPanel';
import NotificationSettings from '@/components/profile/NotificationSettings';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      integrations: true,
      settings: true,
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
            Profile & Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account, integrations, and preferences
          </p>
        </div>

        <div className="space-y-6">
          <ProfileSettings user={user} />
          <IntegrationsPanel integrations={user.integrations} />
          <NotificationSettings settings={user.settings} />
        </div>
      </main>
    </>
  );
}
