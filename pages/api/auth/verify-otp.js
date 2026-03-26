import { verifyOTP } from '../../../lib/otpStore';
import { sendLoginAlert } from '../../../lib/email';
import { getSession } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const normalised = email.toLowerCase().trim();
  const result = await verifyOTP(normalised, otp);

  if (!result.valid) {
    return res.status(401).json({ error: result.reason });
  }

  const normalizeIp = (value) => {
    if (!value) return '';
    let ip = value.trim();
    if (ip === '::1') return '127.0.0.1';
    if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
    return ip;
  };

  const xff = (req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).find(Boolean);
  const rawIp = xff || req.socket?.remoteAddress || '';
  const ip = normalizeIp(rawIp) || 'Unknown';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const timestamp = new Date().toUTCString();

  let location = 'Unknown';
  if (ip !== 'Unknown' && ip !== '127.0.0.1') {
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      const geo = await geoRes.json();
      if (geo.city) location = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ');
    } catch { /* geolocation unavailable */ }
  }

  const session = await getSession(req, res);
  session.user = { email: normalised, ip, loginTime: timestamp };
  await session.save();

  await sendLoginAlert({ email: normalised, ip, location, userAgent, timestamp }).catch(console.error);

  return res.status(200).json({ success: true });
}