import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import Link from 'next/link';
import { CheckCircle2, Zap, Brain, Target, Leaf } from 'lucide-react';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-white via-stone-beige to-sage-gray/20">
      <nav className="border-b-2 border-moss-green/20 bg-cream-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold font-serif text-forest-green flex items-center gap-2">
              <Leaf className="w-8 h-8" />
              Clariti
            </h1>
            <Link
              href="/api/auth/signin"
              className="px-6 py-3 bg-gradient-to-br from-forest-green to-moss-green text-cream-white font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center py-20 md:py-32">
          <h2 className="text-5xl md:text-6xl font-bold font-serif text-forest-green mb-6">
            From chaos to clarity,
            <br />
            <span className="text-moss-green">one day at a time. 🌿</span>
          </h2>
          <p className="text-xl text-bark-brown mb-8 max-w-2xl mx-auto leading-relaxed">
            The AI-powered productivity assistant that transforms scattered college tasks
            into clear, actionable priorities.
          </p>
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-br from-forest-green to-moss-green text-cream-white text-lg font-semibold rounded-full hover:shadow-xl hover:scale-105 transition-all shadow-lg"
          >
            Get Started Free
            <Zap className="w-5 h-5" />
          </Link>
        </div>

        {/* Features Section */}
        <div className="py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-cream-white p-8 rounded-3xl shadow-md shadow-earth-brown/20 border-2 border-sage-gray/30 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-moss-green/30 rounded-full flex items-center justify-center mb-4">
              <Brain className="w-7 h-7 text-forest-green" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-forest-green mb-3">
              AI-Powered Insights
            </h3>
            <p className="text-bark-brown leading-relaxed">
              Cohere AI analyzes and prioritizes your tasks, assignments, and deadlines
              to show you what truly matters.
            </p>
          </div>

          <div className="bg-cream-white p-8 rounded-3xl shadow-md shadow-earth-brown/20 border-2 border-sage-gray/30 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-ocean-teal/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-forest-green" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-forest-green mb-3">
              All-in-One Dashboard
            </h3>
            <p className="text-bark-brown leading-relaxed">
              Connect Canvas, Gmail, Google Calendar, and Slack. Everything
              in one place.
            </p>
          </div>

          <div className="bg-cream-white p-8 rounded-3xl shadow-md shadow-earth-brown/20 border-2 border-sage-gray/30 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-sunflower-yellow/30 rounded-full flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-forest-green" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-forest-green mb-3">
              Daily Focus Brief
            </h3>
            <p className="text-bark-brown leading-relaxed">
              Start each day with a personalized brief that tells you exactly what to
              focus on today.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 text-center">
          <h3 className="text-4xl font-bold font-serif text-forest-green mb-4">
            Ready to get clarity? 🌱
          </h3>
          <p className="text-lg text-bark-brown mb-8">
            Join students who are taking control of their academic life.
          </p>
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-br from-forest-green to-moss-green text-cream-white text-lg font-semibold rounded-full hover:shadow-xl hover:scale-105 transition-all shadow-lg"
          >
            Start Using Clariti
          </Link>
        </div>
      </main>

      <footer className="border-t-2 border-moss-green/20 py-8 mt-20 bg-cream-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-bark-brown">
          <p className="font-medium">&copy; 2025 Clariti. Made with 🌿 for students.</p>
        </div>
      </footer>
    </div>
  );
}
