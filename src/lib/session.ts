import type { IronSession, IronSessionOptions } from 'iron-session';
import { getIronSession } from 'iron-session';
import type {
  RequestCookies,
  ReadonlyRequestCookies,
} from 'next/dist/server/web/spec-extension/cookies';

export interface SessionData {
  userId?: number;
  username?: string;
  isLoggedIn: boolean;
  gtaw_access_token?: string;
  role?: string;
}

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const sessionOptions: IronSessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: 'mdc-session',
  ttl: MAX_AGE,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  },
};

export async function getSession(
  cookies: RequestCookies | ReadonlyRequestCookies
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(cookies as RequestCookies, sessionOptions);
}
