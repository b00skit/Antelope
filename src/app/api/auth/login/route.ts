import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
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

    const { csrfToken } = await createSession(user.id, user.username);

    return new Response(
      JSON.stringify({ message: 'Login successful', csrfToken }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ message: 'An internal error occurred' }), { status: 500 });
  }
}
