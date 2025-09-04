import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

const protectedRoutes = [
    '/',
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
    '/factions'
];
const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const session = await getIronSession<SessionData>(request.cookies, sessionOptions);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname === route || (route !== '/' && pathname.startsWith(route + '/')));
  const isPublicRoute = publicRoutes.includes(pathname);
  
  if (isProtectedRoute && !session.isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (isPublicRoute && session.isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url));
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
