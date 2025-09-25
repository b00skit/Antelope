
import { notFound } from 'next/navigation';
import { Cat2MembersPage } from '@/components/units-divisions/cat2-members-page';

interface Cat2PageProps {
    params: {
        cat1Id: string;
        cat2Id: string;
    }
}

export default function Cat2MembersManagementPage({ params }: Cat2PageProps) {
    const cat1Id = parseInt(params.cat1Id, 10);
    const cat2Id = parseInt(params.cat2Id, 10);

    if (isNaN(cat1Id) || isNaN(cat2Id)) {
        return notFound();
    }

    return <Cat2MembersPage cat1Id={cat1Id} cat2Id={cat2Id} />;
}
