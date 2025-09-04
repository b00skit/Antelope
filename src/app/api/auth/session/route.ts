import { getServerSession } from '@/lib/session';

export async function GET(request: Request) {
  const csrfToken = request.headers.get('x-csrf-token') || '';
  const session = await getServerSession(csrfToken);

  if (!session) {
    return new Response(JSON.stringify({ isLoggedIn: false }), { status: 200 });
  }

  return new Response(
    JSON.stringify({ isLoggedIn: true, username: session.user.username }),
    { status: 200 }
  );
}
