import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return new Response(JSON.stringify({ isLoggedIn: false }), { status: 200 });
  }

  return new Response(
    JSON.stringify({ isLoggedIn: true, username: session.username }),
    { status: 200 }
  );
}
