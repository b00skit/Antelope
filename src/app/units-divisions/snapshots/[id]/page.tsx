
import { SnapshotViewPage } from '@/components/units-divisions/snapshot-view-page';
import { notFound } from 'next/navigation';

interface SnapshotPageProps {
    params: {
        id: string;
    }
}

export default function OrgSnapshotPage({ params }: SnapshotPageProps) {
    const [type, idStr] = params.id.split('-');
    const id = parseInt(idStr, 10);

    if (!['cat2', 'cat3'].includes(type) || isNaN(id)) {
        return notFound();
    }

    return <SnapshotViewPage snapshotId={id} type={type as 'cat2' | 'cat3'} />;
}
