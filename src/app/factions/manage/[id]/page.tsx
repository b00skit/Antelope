import { ManageFactionClientPage } from '@/components/factions/manage-client-page';
import { db } from '@/db';
import { factions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface ManagePageProps {
    params: {
        id: string;
    }
}

async function getFaction(id: number) {
    const faction = await db.query.factions.findFirst({
        where: eq(factions.id, id),
    });
    return faction;
}

export default async function ManageFactionPage({ params }: ManagePageProps) {
    const factionId = parseInt(params.id, 10);
    if (isNaN(factionId)) {
        return notFound();
    }
    
    const faction = await getFaction(factionId);
    
    if (!faction) {
        return notFound();
    }

    return <ManageFactionClientPage faction={faction} />;
}
