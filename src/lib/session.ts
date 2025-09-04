import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

const SESSION_COOKIE_NAME = 'session-token';

export type Session = typeof sessions.$inferSelect;

function buildCondition(token: string, csrf?: string) {
  let condition = and(eq(sessions.token, token), gt(sessions.expiresAt, new Date()));
  if (csrf) {
    condition = and(condition, eq(sessions.csrfToken, csrf));
  }
  return condition;
}

async function findSession(token: string, csrf?: string) {
  return db.query.sessions.findFirst({ where: buildCondition(token, csrf) });
}

export async function createSession(userId: number, username: string, gtawAccessToken?: string) {
  const token = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    token,
    userId,
    username,
    csrfToken,
    gtawAccessToken,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
  cookieStore.set('csrf-token', csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
  return { csrfToken };
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const csrf = headers().get('x-csrf-token') || undefined;
  return findSession(token, csrf);
}

export async function getSessionFromRequest(req: NextRequest): Promise<Session | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const csrf = req.headers.get('x-csrf-token') || undefined;
  return findSession(token, csrf);
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  cookieStore.set(SESSION_COOKIE_NAME, '', { path: '/', expires: new Date(0) });
  cookieStore.set('csrf-token', '', { path: '/', expires: new Date(0) });
}

export { SESSION_COOKIE_NAME };
