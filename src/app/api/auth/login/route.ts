import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { IronSession, getIronSession } from 'iron-session';
import { SessionData, sessionOptions, createServerSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  // Call cookies() first to get the cookie store
  const cookieStore = await cookies(); 
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const { username, password } = await request.json();

  if (!username || !password) {
    return new Response(JSON.stringify({ message: 'Username and password are required' }), { status: 400 });
  }

  try {
    const user = await db.query.users.findFirst({
        where: eq(users.username, username)
    });

    if (!user || !user.password) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
    }

    const { id, csrfToken } = await createServerSession(user.id);
    session.isLoggedIn = true;
    session.sessionId = id;
    await session.save();
    cookieStore.set('csrf-token', csrfToken, { httpOnly: false, sameSite: 'strict' });

    return new Response(JSON.stringify({ message: 'Login successful' }), { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ message: 'An internal error occurred' }), { status: 500 });
  }
}
