import { setOTP } from '../../../lib/otpStore';
import { sendOTPEmail } from '../../../lib/email';

function generate6DigitOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body || {};
  const domain = process.env.ALLOWED_DOMAIN || 'yourhappylife.com';

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const normalised = email.toLowerCase().trim();

  if (!normalised.endsWith(`@${domain}`)) {
    return res.status(403).json({ error: `Only @${domain} addresses are permitted.` });
  }

  const otp = generate6DigitOTP();
  await setOTP(normalised, otp);

  try {
    await sendOTPEmail(normalised, otp);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('OTP email failed:', err);
    const message = process.env.NODE_ENV === 'production'
      ? 'Failed to send OTP. Please try again.'
      : `Failed to send OTP. ${err?.message || ''}`;
    return res.status(500).json({ error: message });
  }
}