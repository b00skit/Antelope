import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

const protectedRoutes = [
    '/dashboard',
    '/arrest-calculator',
    '/arrest-report',
    '/paperwork-generators',
    '/simplified-penal-code',
    '/caselaw',
    '/settings',
    '/announcements',
    '/changelog',
    '/credits',
    '/about',
    '/help',
    '/area51',
    '/factions',
    '/users',
    '/setup',
    '/sync-management',
];
const publicRoutes = ['/login', '/'];

export async function middleware(request: NextRequest) {
  const session = await getSession(request.cookies);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname === route || (route !== '/' && pathname.startsWith(route + '/')));
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // If user is not logged in and trying to access a protected route, redirect to login
  if (isProtectedRoute && !session.isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If user is logged in and trying to access the public landing page, redirect to dashboard
  if (pathname === '/' && session.isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is logged in and tries to access login page, redirect to dashboard
  if (pathname === '/login' && session.isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - img (image files in public)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|img|favicon.ico).*)',
  ],
};
