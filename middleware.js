import { NextResponse } from 'next/server';

const PUBLIC = ['/', '/verify', '/api/auth/send-otp', '/api/auth/verify-otp'];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();
  const session = req.cookies.get('yhl_secure_session');
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/viewer/:path*', '/api/me', '/api/logout'],
};