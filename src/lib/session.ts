import type { IronSessionOptions } from 'iron-session';

export interface SessionData {
  userId?: number;
  username?: string;
  isLoggedIn: boolean;
  gtaw_access_token?: string;
}

export const sessionOptions: IronSessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: 'mdc-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};
