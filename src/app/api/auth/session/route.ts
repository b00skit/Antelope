import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const csrf = request.headers.get('x-csrf-token');

  if (!token || !csrf) {
    return new Response(JSON.stringify({ isLoggedIn: false }), { status: 200 });
  }

  const session = await getSession(token);
  if (!session || session.csrfToken !== csrf) {
    return new Response(JSON.stringify({ isLoggedIn: false }), { status: 200 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) {
    return new Response(JSON.stringify({ isLoggedIn: false }), { status: 200 });
  }

  return new Response(
    JSON.stringify({
      isLoggedIn: true,
      username: user.username,
    }),
    { status: 200 },
  );
}