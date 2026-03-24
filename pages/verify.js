import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function VerifyPage() {
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [mounted, setMounted] = useState(false);
  const inputs = useRef([]);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('otp_email');
    if (!stored) { router.push('/'); return; }
    setEmail(stored);
    setMounted(true);
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...otp]; n[i] = v; setOtp(n);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (digits.length === 6) { setOtp(digits.split('')); inputs.current[5]?.focus(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setOtp(Array(6).fill(''));
        inputs.current[0]?.focus();
        return;
      }
      setSuccess(true);
      sessionStorage.removeItem('otp_email');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setCountdown(60);
    setOtp(Array(6).fill(''));
    setError('');
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  };

  const full = otp.join('').length === 6;

  return (
    <>
      <Head>
        <title>Verify OTP — YourHappyLife</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={s.page}>
        <div style={{ ...s.left, opacity: mounted ? 1 : 0, animation: mounted ? 'slideInLeft 0.7s ease forwards' : 'none' }}>
          <div style={s.leftInner}>
            <Image src="/logo.png" alt="YourHappyLife" width={200} height={70} style={{ objectFit:'contain', filter:'brightness(0) invert(1)' }} priority />
            <div>
              <h1 style={s.tagline}>One step<br />away.</h1>
              <p style={s.tagSub}>We've sent a 6-digit code to your email. It expires in 10 minutes.</p>
            </div>
            <div style={s.tipBox}>
              <span style={{ fontSize:24 }}>💡</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:4 }}>Can't find the email?</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.6 }}>Check your spam or junk folder. The sender is your Gmail SMTP address.</div>
              </div>
            </div>
            <button onClick={() => router.push('/')} style={s.backBtn}>← Back to login</button>
          </div>
        </div>

        <div style={{ ...s.right, opacity: mounted ? 1 : 0, animation: mounted ? 'slideInRight 0.7s ease forwards' : 'none' }}>
          <div style={s.card}>
            {success ? (
              <div style={{ textAlign:'center', animation:'fadeUp 0.5s ease forwards' }}>
                <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
                <h2 style={{ ...s.h2, color:'#16a34a' }}>Verified!</h2>
                <p style={{ color:'#888', fontSize:14 }}>Redirecting to your documents…</p>
              </div>
            ) : (
              <>
                <div style={s.cardHeader}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
                  <h2 style={s.h2}>Enter your code</h2>
                  <p style={s.sub}>Sent to <strong style={{ color:'#BF0426' }}>{email}</strong></p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={s.otpRow} onPaste={handlePaste}>
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={el => inputs.current[i] = el}
                        type="text" inputMode="numeric" maxLength={1} value={d}
                        onChange={e => handleChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        style={{
                          ...s.otpBox,
                          borderColor: error ? '#BF0426' : d ? '#BF0426' : '#e2e8f0',
                          background: error ? '#FFF0F2' : d ? '#FFF0F2' : '#fff',
                          transform: d ? 'scale(1.05)' : 'scale(1)',
                        }}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  {error && (
                    <div style={s.errBox}>
                      <span>⚠️</span><span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{ ...s.btn, opacity: full ? 1 : 0.45, cursor: full ? 'pointer' : 'not-allowed' }}
                    disabled={!full || loading}
                  >
                    {loading ? (
                      <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                        <span style={s.btnSpinner} />Verifying…
                      </span>
                    ) : 'Verify & Enter Portal →'}
                  </button>
                </form>

                <div style={s.resendRow}>
                  {countdown > 0 ? (
                    <span style={{ color:'#bbb', fontSize:13 }}>Resend in <strong style={{ color:'#BF0426' }}>{countdown}s</strong></span>
                  ) : (
                    <span style={{ color:'#BF0426', cursor:'pointer', fontWeight:700, fontSize:13 }} onClick={resend}>
                      📨 Resend OTP
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', fontFamily:"'Syne',sans-serif" },
  left: { flex:1, background:'linear-gradient(160deg, #BF0426 0%, #8C001B 100%)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 56px' },
  leftInner: { display:'flex', flexDirection:'column', gap:32, maxWidth:400 },
  tagline: { fontSize:'clamp(28px,3vw,44px)', fontWeight:800, color:'#fff', lineHeight:1.15, marginBottom:12 },
  tagSub: { fontSize:15, color:'rgba(255,255,255,0.75)', lineHeight:1.8 },
  tipBox: { display:'flex', gap:14, background:'rgba(255,255,255,0.12)', borderRadius:14, padding:'16px 18px', backdropFilter:'blur(8px)' },
  backBtn: { background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', padding:'10px 20px', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:"'Syne',sans-serif", width:'fit-content' },
  right: { width:'480px', minWidth:'320px', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px' },
  card: { width:'100%', maxWidth:400 },
  cardHeader: { textAlign:'center', marginBottom:32 },
  h2: { fontSize:26, fontWeight:800, color:'#1a1a2e', marginBottom:8 },
  sub: { fontSize:13, color:'#888' },
  otpRow: { display:'flex', gap:10, justifyContent:'center', marginBottom:24 },
  otpBox: { width:'14%', maxWidth:56, aspectRatio:'1', textAlign:'center', fontSize:24, fontWeight:800, border:'2px solid', borderRadius:12, outline:'none', transition:'all 0.15s', fontFamily:"'Syne',sans-serif", color:'#BF0426' },
  errBox: { display:'flex', alignItems:'center', gap:8, background:'#FFF0F2', border:'1.5px solid #FADADD', borderRadius:10, padding:'12px 14px', color:'#BF0426', fontSize:13, fontWeight:600, marginBottom:16 },
  btn: { width:'100%', padding:16, background:'linear-gradient(135deg, #BF0426, #8C001B)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'Syne',sans-serif", transition:'all 0.2s', boxShadow:'0 4px 16px rgba(191,4,38,0.35)' },
  btnSpinner: { width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' },
  resendRow: { textAlign:'center', marginTop:24 },
};