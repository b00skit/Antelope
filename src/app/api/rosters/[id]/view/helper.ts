'use server';

import { getRosterViewData as getRosterViewDataInternal } from '@/api/rosters/[id]/view/helper';

export async function getRosterViewData(
    ...args: Parameters<typeof getRosterViewDataInternal>
) {
    return getRosterViewDataInternal(...args);
}
