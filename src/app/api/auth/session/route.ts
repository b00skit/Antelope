import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  
  if (!session.isLoggedIn) {
    return new Response(JSON.stringify({ isLoggedIn: false }), { status: 200 });
  }

  return new Response(JSON.stringify({
    isLoggedIn: true,
    username: session.username,
  }), { status: 200 });
}
