
import { SnapshotViewPage } from '@/components/activity-rosters/snapshot-view-page';
import { notFound } from 'next/navigation';

interface SnapshotPageProps {
    params: {
        id: string;
    }
}

export default function RosterSnapshotPage({ params }: SnapshotPageProps) {
    const snapshotId = parseInt(params.id, 10);
    if (isNaN(snapshotId)) {
        return notFound();
    }

    return <SnapshotViewPage snapshotId={snapshotId} />;
}
