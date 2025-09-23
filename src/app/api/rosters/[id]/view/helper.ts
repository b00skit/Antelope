'use server';

import { getRosterViewData as getRosterViewDataInternal } from '@/api/rosters/[id]/view/helper';
import type { IronSession } from 'iron-session';
import type { SessionData } from '@/lib/session';

export async function getRosterViewData(
    rosterId: number,
    session: IronSession<SessionData>,
    _forceSync = false,
) {
    return getRosterViewDataInternal(rosterId, session, _forceSync);
}
