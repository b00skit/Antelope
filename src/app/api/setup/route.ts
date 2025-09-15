
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { setup, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const setupSchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore);

  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized. You must be logged in to perform setup.' }, { status: 401 });
  }

  const setupToken = process.env.SETUP_TOKEN;
  if (!setupToken) {
    return NextResponse.json({ error: 'Setup token is not configured on the server.' }, { status: 500 });
  }

  const setupState = await db.query.setup.findFirst();
  if (setupState?.completed) {
    return NextResponse.json({ error: 'Setup has already been completed.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = setupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    if (parsed.data.token !== setupToken) {
      return NextResponse.json({ error: 'Invalid setup token.' }, { status: 403 });
    }

    // Use a transaction to ensure both operations succeed or fail together.
    // The transaction function must be synchronous for better-sqlite3.
    await db.transaction(async (tx) => {
      // Grant superadmin role
      await tx.update(users)
        .set({ role: 'superadmin' })
        .where(eq(users.id, session.userId!));
    const dbType = process.env.DATABASE ?? 'sqlite';
    if (dbType === 'mysql' || dbType === 'mariadb') {
      await db.transaction(async (tx) => {
        // Grant superadmin role
        await tx
          .update(users)
          .set({ role: 'superadmin' })
          .where(eq(users.id, session.userId!));

        // Mark setup as complete
        await tx.insert(setup).values({ completed: true }).onConflictDoUpdate({
          target: setup.completed,
          set: { completed: true },
        });
      });
    } else {
      db.transaction((tx) => {
        // Grant superadmin role
        tx
          .update(users)
          .set({ role: 'superadmin' })
          .where(eq(users.id, session.userId!));

        // Mark setup as complete
        tx.insert(setup).values({ completed: true }).onConflictDoUpdate({
          target: setup.completed,
          set: { completed: true },
        });
      });
    }

    // Update the session with the new role
    session.role = 'superadmin';
    await session.save();

    return NextResponse.json({ success: true, message: 'Setup completed successfully. You are now a superadmin.' });

  } catch (error) {
    console.error('[API Setup] Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
