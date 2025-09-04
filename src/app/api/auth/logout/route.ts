import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { deleteSession } from '@/lib/session';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (token) {
    await deleteSession(token);
    cookieStore.delete('session');
    cookieStore.delete('csrf-token');
  }
  return redirect('/login');
}
