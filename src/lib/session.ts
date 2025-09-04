import { randomBytes } from 'crypto';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface SessionRecord {
  id: string;
  userId: number;
  csrfToken: string;
  gtawAccessToken?: string | null;
  createdAt: Date | null;
}

export async function createSession(userId: number, gtawAccessToken?: string) {
  const id = randomBytes(24).toString('hex');
  const csrfToken = randomBytes(24).toString('hex');
  const createdAt = new Date();
  await db.insert(sessions).values({ id, userId, csrfToken, gtawAccessToken, createdAt });
  return { id, csrfToken };
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  return session ?? null;
}

export async function deleteSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}
