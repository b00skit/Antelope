
import { RosterViewPage } from '@/components/activity-rosters/roster-view-page';
import { notFound } from 'next/navigation';

interface RosterPageProps {
    params: {
        id: string;
    }
}

export default function ActivityRosterPage({ params }: RosterPageProps) {
    const rosterId = parseInt(params.id, 10);
    if (isNaN(rosterId)) {
        return notFound();
    }

    // The RosterViewPage is a client component that will handle all of its own data fetching.
    return <RosterViewPage rosterId={rosterId} />;
}
