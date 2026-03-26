import nodemailer from 'nodemailer';

const isSmtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

let transporter = null;
if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  console.warn('SMTP is not configured. OTP emails will be logged to the console in development mode.');
}

export async function sendOTPEmail(email, otp) {
  if (!isSmtpConfigured) {
    console.info(`[DEV MODE] OTP for ${email}: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: `"YHL Secure Docs" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Login OTP — Secure Document Portal',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f9f9f9;padding:32px;border-radius:12px;">
        <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">Secure Document Portal</h2>
        <p style="color:#555;margin:0 0 28px;">Your one-time login code:</p>
        <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#e53e3e;background:#fff;padding:20px;border-radius:8px;text-align:center;border:2px solid #fde8e8;">
          ${otp}
        </div>
        <p style="color:#888;margin:24px 0 0;font-size:13px;">
          Valid for <strong>10 minutes</strong>. Do not share this with anyone.<br/>
          If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendLoginAlert({ email, ip, userAgent, timestamp }) {
  if (!isSmtpConfigured) return;
  const browser = parseUA(userAgent);
  await transporter.sendMail({
    from: `"YHL Security" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `Login Alert: ${email}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;">
        <h2 style="color:#e53e3e;margin:0 0 20px;">Login Alert — Secure Document Portal</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="background:#f5f5f5;"><td style="padding:10px 14px;font-weight:600;width:130px;">User</td><td style="padding:10px 14px;">${email}</td></tr>
          <tr><td style="padding:10px 14px;font-weight:600;">Time (UTC)</td><td style="padding:10px 14px;">${timestamp}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:10px 14px;font-weight:600;">IP Address</td><td style="padding:10px 14px;">${ip}</td></tr>
          <tr><td style="padding:10px 14px;font-weight:600;">Device</td><td style="padding:10px 14px;">${browser}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:10px 14px;font-weight:600;">Raw UA</td><td style="padding:10px 14px;font-size:11px;color:#888;">${userAgent}</td></tr>
        </table>
      </div>
    `,
  });
}

function parseUA(ua = '') {
  const browsers = ['Edg', 'Chrome', 'Firefox', 'Safari', 'Opera'];
  const oses = ['Windows NT', 'Mac OS X', 'Linux', 'Android', 'iPhone', 'iPad'];
  const b = browsers.find(x => ua.includes(x)) || 'Unknown browser';
  const o = oses.find(x => ua.includes(x)) || 'Unknown OS';
  return `${b} on ${o}`;
}