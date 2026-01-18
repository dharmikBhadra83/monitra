import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporary middleware that allows all routes until next-auth is installed
// After installing next-auth, replace this file with the content from middleware.auth.ts
export function middleware(request: NextRequest) {
  // Allow all routes for now - auth will be enabled after next-auth installation
  // TODO: After running: npm install next-auth@beta @auth/prisma-adapter
  // Delete this file and rename middleware.auth.ts to middleware.ts
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
