
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET() {
  const cookieStore = await cookies(); 
  const session = await getSession(cookieStore);
  
  if (!session.isLoggedIn || !session.userId) {
    return new Response(JSON.stringify({ isLoggedIn: false, hasActiveFaction: false }), { status: 200 });
  }

  // Check for active faction
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: {
        selectedFaction: true,
    }
  });
  
  let hasActiveFaction = false;
  let factionRank = null;

  if (user?.selected_faction_id) {
    const membership = await db.query.factionMembers.findFirst({
        where: and(
            eq(factionMembers.userId, session.userId),
            eq(factionMembers.factionId, user.selected_faction_id),
            eq(factionMembers.joined, true)
        )
    });
    if (membership) {
        hasActiveFaction = true;
        factionRank = membership.rank;
    }
  }

  return new Response(JSON.stringify({
    isLoggedIn: true,
    username: session.username,
    role: session.role,
    hasActiveFaction,
    activeFaction: user?.selectedFaction,
    factionRank,
  }), { status: 200 });
}
