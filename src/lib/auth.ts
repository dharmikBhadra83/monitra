// @ts-ignore - next-auth types will be available after npm install
// @ts-ignore
import GoogleProvider from 'next-auth/providers/google';
// @ts-ignore
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

// Validate required environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

// Check if required env vars are missing
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️  Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local');
}

if (!NEXTAUTH_SECRET) {
  console.warn('⚠️  NEXTAUTH_SECRET not set. Please generate one using: openssl rand -base64 32');
}

// @ts-ignore
import NextAuth from 'next-auth';

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID ,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login?error=ConfigurationError',
  },
  callbacks: {
    async session({ session, user }: any) {
      if (session.user && user) {
        session.user.id = user.id;
        session.user.onboardingCompleted = user.onboardingCompleted;
        session.user.companyName = user.companyName;
        session.user.role = user.role;
        session.user.employeeCount = user.employeeCount;
      }
      return session;
    },
  },
  session: {
    strategy: 'database',
  },
  secret: NEXTAUTH_SECRET,
});

// For backward compatibility if needed elsewhere
export const authOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'database' },
  secret: NEXTAUTH_SECRET,
};
