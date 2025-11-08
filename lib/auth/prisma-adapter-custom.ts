import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import type { Adapter } from 'next-auth/adapters';

export function CustomPrismaAdapter(prisma: PrismaClient): Adapter {
  const adapter = PrismaAdapter(prisma) as Adapter;

  return {
    ...adapter,
    linkAccount: async (account: any) => {
      // Remove the refresh_token_expires_in field that Google returns
      // but isn't in our Prisma schema
      const { refresh_token_expires_in, ...accountData } = account;
      
      return prisma.account.create({
        data: accountData,
      }) as any;
    },
  };
}
