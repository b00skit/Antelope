import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get('session')?.value);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname === route || (route !== '/' && pathname.startsWith(route + '/')));
  const isPublicRoute = publicRoutes.includes(pathname);
  
  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute && hasSession) {
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
