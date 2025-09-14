import { db } from '@/db';
import { users, factionMembers, factionOrganizationCat1, factionOrganizationCat2 } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function canManageCat2(session: any, cat2Id: number) {
    if (!session.isLoggedIn || !session.userId) {
        return { authorized: false, message: 'Unauthorized' };
    }

    const cat2 = await db.query.factionOrganizationCat2.findFirst({
        where: eq(factionOrganizationCat2.id, cat2Id),
        with: { cat1: true }
    });

    if (!cat2) {
        return { authorized: false, message: 'Unit not found.' };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true }
    });
    
    if (user?.selectedFaction?.id !== cat2.faction_id) {
        return { authorized: false, message: 'Mismatched faction.' };
    }

    const membership = await db.query.factionMembers.findFirst({
        where: and(
            eq(factionMembers.userId, session.userId), 
            eq(factionMembers.factionId, cat2.faction_id)
        )
    });

    if (!membership) {
        return { authorized: false, message: 'Not a member of this faction.' };
    }

    // Check for admin rank
    if (membership.rank >= (user.selectedFaction.administration_rank ?? 15)) {
        return { authorized: true };
    }

    // Check for Cat2 access
    if (cat2.access_json?.includes(session.userId)) {
        return { authorized: true };
    }
    
    // Check for parent Cat1 access
    if (cat2.cat1.access_json?.includes(session.userId)) {
        return { authorized: true };
    }

    return { authorized: false, message: 'You do not have permission to manage this unit.' };
}
