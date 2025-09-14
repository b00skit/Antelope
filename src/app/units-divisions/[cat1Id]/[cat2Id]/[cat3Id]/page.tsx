
import { notFound } from 'next/navigation';
import { Cat3ClientPage } from '@/components/units-divisions/cat3-client-page';

interface Cat3PageProps {
    params: {
        cat1Id: string;
        cat2Id: string;
        cat3Id: string;
    }
}

export default function Cat3Page({ params }: Cat3PageProps) {
    const cat1Id = parseInt(params.cat1Id, 10);
    const cat2Id = parseInt(params.cat2Id, 10);
    const cat3Id = parseInt(params.cat3Id, 10);

    if (isNaN(cat1Id) || isNaN(cat2Id) || isNaN(cat3Id)) {
        return notFound();
    }

    return <Cat3ClientPage cat1Id={cat1Id} cat2Id={cat2Id} cat3Id={cat3Id} />;
}
