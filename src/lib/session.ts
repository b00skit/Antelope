import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import type { IronSessionOptions } from 'iron-session';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface SessionData {
  sessionId?: string;
  isLoggedIn: boolean;
}

export const sessionOptions: IronSessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: 'mdc-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export type DbSession = typeof sessions.$inferSelect & {
  user: typeof users.$inferSelect;
};

export async function createServerSession(userId: number, gtawAccessToken?: string) {
  const id = randomBytes(24).toString('hex');
  const csrfToken = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id,
    userId,
    csrfToken,
    gtawAccessToken,
    expiresAt,
  });

  return { id, csrfToken };
}

export async function getServerSession(csrfToken?: string): Promise<DbSession | null> {
  const cookieStore = cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.sessionId) return null;

  const dbSession = await db.query.sessions.findFirst({
    where: eq(sessions.id, session.sessionId),
    with: { user: true },
  });
  if (!dbSession) return null;
  if (csrfToken && dbSession.csrfToken !== csrfToken) return null;
  return dbSession;
}

export async function deleteServerSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}
