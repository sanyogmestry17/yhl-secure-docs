import { getIronSession } from 'iron-session';

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'yhl_secure_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
  },
};

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}