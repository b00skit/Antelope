import { db } from '@/db';
import { users, factionMembers, factionOrganizationCat1, factionOrganizationCat2, factionOrganizationCat3 } from '@/db/schema';
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
        return { authorized: true, factionId: user.selectedFaction.id, user, membership, faction: user.selectedFaction };
    }

    // Check for Cat2 access
    if (cat2.access_json?.includes(session.userId)) {
        return { authorized: true, factionId: user.selectedFaction.id, user, membership, faction: user.selectedFaction };
    }
    
    // Check for parent Cat1 access
    if (cat2.cat1.access_json?.includes(session.userId)) {
        return { authorized: true, factionId: user.selectedFaction.id, user, membership, faction: user.selectedFaction };
    }

    return { authorized: false, message: 'You do not have permission to manage this unit.' };
}


// A more generic helper for checking any unit/detail
export async function canUserManage(session: any, user: any, membership: any, faction: any, type: 'cat_2' | 'cat_3', id: number) {
    if (!session || !user || !membership || !faction) {
        return { authorized: false, message: "Invalid session." }
    }
    
     if (membership.rank >= (faction.administration_rank ?? 15)) {
        return { authorized: true };
    }
    
    if (type === 'cat_2') {
        const cat2 = await db.query.factionOrganizationCat2.findFirst({
            where: eq(factionOrganizationCat2.id, id),
            with: { cat1: true },
        });
        if (!cat2) return { authorized: false, message: 'Not found.' };
        if (cat2.access_json?.includes(session.userId) || cat2.cat1.access_json?.includes(session.userId)) {
            return { authorized: true };
        }
    } else { // cat_3
        const cat3 = await db.query.factionOrganizationCat3.findFirst({
            where: eq(factionOrganizationCat3.id, id),
            with: { cat2: { with: { cat1: true } } }
        });
        if (!cat3) return { authorized: false, message: 'Not found.' };
         if (cat3.access_json?.includes(session.userId) || cat3.cat2.access_json?.includes(session.userId) || cat3.cat2.cat1.access_json?.includes(session.userId)) {
            return { authorized: true };
        }
    }

    return { authorized: false, message: 'Permission denied.' };
}
