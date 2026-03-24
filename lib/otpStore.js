if (!global._otpStore) global._otpStore = new Map();
const store = global._otpStore;

export function setOTP(email, otp) {
  store.set(email, {
    otp,
    expires: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });
}

export function verifyOTP(email, otp) {
  const record = store.get(email);
  if (!record) return { valid: false, reason: 'No OTP found. Please request a new one.' };
  if (Date.now() > record.expires) {
    store.delete(email);
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  if (record.attempts >= 3) {
    store.delete(email);
    return { valid: false, reason: 'Too many failed attempts. Please request a new OTP.' };
  }
  if (record.otp !== otp) {
    record.attempts++;
    const left = 3 - record.attempts;
    return { valid: false, reason: `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.` };
  }
  store.delete(email);
  return { valid: true };
}