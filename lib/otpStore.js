import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const OTP_TTL = 10 * 60; // 10 minutes in seconds
const MAX_ATTEMPTS = 3;

export async function setOTP(email, otp) {
  await redis.set(
    `otp:${email}`,
    { otp, attempts: 0 },
    { ex: OTP_TTL }
  );
}

export async function verifyOTP(email, otp) {
  const key = `otp:${email}`;
  const record = await redis.get(key);

  if (!record) return { valid: false, reason: 'No OTP found. Please request a new one.' };

  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(key);
    return { valid: false, reason: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (record.otp !== otp) {
    await redis.set(key, { ...record, attempts: record.attempts + 1 }, { keepttl: true });
    const left = MAX_ATTEMPTS - (record.attempts + 1);
    return { valid: false, reason: `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.` };
  }

  await redis.del(key);
  return { valid: true };
}
