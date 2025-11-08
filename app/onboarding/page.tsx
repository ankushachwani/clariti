import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
import OnboardingIntegrations from '@/components/onboarding/OnboardingIntegrations';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      integrations: true,
    },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Welcome to Clariti! 👋
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Let's connect your apps to bring everything together
          </p>
        </div>

        <OnboardingIntegrations integrations={user.integrations} userName={user.name || 'there'} />
      </div>
    </main>
  );
}
