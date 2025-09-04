import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET() {
  // Call cookies() first to get the cookie store
  const cookieStore = await cookies(); 
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.destroy();
  return redirect('/login');
}
