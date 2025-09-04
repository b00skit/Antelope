import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { createSession } from '@/lib/session';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://ucp.gta.world/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.GTAW_CLIENT_ID!,
        client_secret: process.env.GTAW_CLIENT_SECRET!,
        redirect_uri: process.env.GTAW_CALLBACK_URL!,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Failed to get access token:', errorBody);
      throw new Error('Failed to exchange authorization code for token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Use access token to get user data
    const userResponse = await fetch('https://ucp.gta.world/api/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }

    const gtawUserData = await userResponse.json();
    const gtawUserId = gtawUserData.user.id;
    const gtawUsername = gtawUserData.user.username;

    // 3. Find or create user in our database
    let user = await db.query.users.findFirst({
        where: eq(users.gtaw_user_id, gtawUserId),
    });

    if (!user) {
      // User doesn't exist, create a new one
      const newUser = {
        username: gtawUsername,
        gtaw_user_id: gtawUserId,
        password: null, // No password for OAuth users
      };
      const result = await db.insert(users).values(newUser).returning();
      user = result[0];
    }

    await createSession(user.id, user.username, accessToken);

    return redirect('/');

  } catch (error) {
    console.error('OAuth callback error:', error);
    return redirect('/login?error=OAuth failed');
  }
}
