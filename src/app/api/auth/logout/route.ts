import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export async function GET() {
  // Call cookies() first to get the cookie store
  const cookieStore = await cookies();
  const session = await getSession(cookieStore);
  session.destroy();
  return redirect('/login');
}
