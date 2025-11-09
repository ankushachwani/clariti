'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Leaf, Sparkles } from 'lucide-react';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-white via-stone-beige to-sage-gray/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-cream-white rounded-3xl shadow-xl shadow-earth-brown/20 border-2 border-sage-gray/30 p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage-gray/5"></div>
        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Leaf className="w-12 h-12 text-forest-green" />
              <h1 className="text-5xl font-bold font-serif text-forest-green">
                Clariti
              </h1>
            </div>
            <p className="text-bark-brown text-lg">
              Sign in to start organizing your academic life 🌿
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-stone-beige/50 text-bark-brown border-2 border-sage-gray/40 rounded-2xl hover:bg-stone-beige hover:shadow-md transition-all disabled:opacity-50 font-semibold"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="mt-6 text-center text-sm text-bark-brown">
            <p>By signing in, you agree to connect your</p>
            <p className="font-medium">Gmail and Google Calendar to Clariti</p>
          </div>

          <div className="mt-8 p-5 bg-gradient-to-r from-moss-green/20 to-ocean-teal/20 rounded-2xl border-2 border-moss-green/30">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-forest-green flex-shrink-0 mt-0.5" />
              <p className="text-sm text-forest-green font-medium leading-relaxed">
                <strong>Tip:</strong> After signing in, connect your Canvas and Slack
                accounts in Settings to get the full experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
