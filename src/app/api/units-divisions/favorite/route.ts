import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { organizationFavorites, users, factionOrganizationCat2, factionOrganizationCat3 } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const favoriteSchema = z.object({
    category_id: z.number().int(),
    category_type: z.enum(['cat_2', 'cat_3']),
});

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const parsed = favoriteSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    const { category_id, category_type } = parsed.data;

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });
        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        const existingFavorite = await db.query.organizationFavorites.findFirst({
            where: and(
                eq(organizationFavorites.user_id, session.userId),
                eq(organizationFavorites.category_id, category_id),
                eq(organizationFavorites.category_type, category_type)
            ),
        });
        
        if (existingFavorite) {
            // Unfavorite
            await db.delete(organizationFavorites).where(eq(organizationFavorites.id, existingFavorite.id));
            return NextResponse.json({ success: true, message: 'Removed from favorites.' });
        } else {
            // Favorite
            let categoryName = '';
            let categoryPath = '';
            if (category_type === 'cat_2') {
                const cat2 = await db.query.factionOrganizationCat2.findFirst({ where: eq(factionOrganizationCat2.id, category_id), with: { cat1: true }});
                if (!cat2) return NextResponse.json({ error: 'Unit not found.' }, { status: 404 });
                categoryName = cat2.name;
                categoryPath = `/units-divisions/${cat2.cat1.id}/${cat2.id}`;
            } else {
                const cat3 = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, category_id), with: { cat2: { with: { cat1: true }}}});
                if (!cat3) return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
                categoryName = cat3.name;
                categoryPath = `/units-divisions/${cat3.cat2.cat1.id}/${cat3.cat2.id}/${cat3.id}`;
            }

            await db.insert(organizationFavorites).values({
                user_id: session.userId,
                faction_id: user.selected_faction_id,
                category_id,
                category_type,
                category_name: categoryName,
                category_path: categoryPath,
            });
            return NextResponse.json({ success: true, message: 'Added to favorites.' });
        }
    } catch (error) {
        console.error(`[API Org Favorite] Error toggling favorite:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
