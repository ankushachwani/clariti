import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prisma';
import { CustomPrismaAdapter } from './prisma-adapter-custom';

export const authOptions: NextAuthOptions = {
  adapter: CustomPrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Allow sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to onboarding after sign-in
      if (url === `${baseUrl}/dashboard`) {
        return `${baseUrl}/onboarding`;
      }
      // If URL contains callback, redirect to onboarding
      if (url.includes('/api/auth/callback') || url.includes('/api/auth/signin')) {
        return `${baseUrl}/onboarding`;
      }
      // If relative URL, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // If same origin, allow
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to onboarding
      return `${baseUrl}/onboarding`;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'database',
  },
  debug: true,
};
