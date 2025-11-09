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
    <main className="min-h-screen bg-gradient-to-br from-cream-white via-stone-beige to-sage-gray/20">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold font-serif text-forest-green mb-4">
            Welcome to Clariti! 👋
          </h1>
          <p className="text-xl text-bark-brown">
            Let's connect your apps to bring everything together
          </p>
        </div>

        <OnboardingIntegrations integrations={user.integrations} userName={user.name || 'there'} />
      </div>
    </main>
  );
}
