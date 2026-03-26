import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [geoState, setGeoState] = useState('requesting'); // 'requesting' | 'granted' | 'denied'
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (!navigator.geolocation) {
      // Browser doesn't support geolocation — allow login anyway
      setGeoState('granted');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sessionStorage.setItem('geo_lat', pos.coords.latitude);
        sessionStorage.setItem('geo_lon', pos.coords.longitude);
        setGeoState('granted');
      },
      () => {
        setGeoState('denied');
      },
      { timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      sessionStorage.setItem('otp_email', email.toLowerCase().trim());
      router.push('/verify');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Secure Docs — YourHappyLife</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div style={s.page}>
        {/* Left panel — hidden on mobile */}
        <div className="login-left" style={{ ...s.left, opacity: mounted ? 1 : 0, animation: mounted ? 'slideInLeft 0.7s ease forwards' : 'none' }}>
          <div style={s.leftInner}>
            <div style={{ animation: 'float 4s ease-in-out infinite' }}>
              <Image src="/logo.png" alt="YourHappyLife" width={200} height={70} style={{ objectFit:'contain', filter:'brightness(0) invert(1)' }} priority />
            </div>
            <div>
              <h1 style={s.tagline}>Your documents.<br />Secured.</h1>
              <p style={s.tagSub}>Internal portal for YourHappyLife team members. All access is logged and monitored.</p>
            </div>
            <div style={s.featureList}>
              {[
                ['🔐', 'OTP Authentication', 'One-time passwords via email'],
                ['👁️', 'View Only Access', 'No downloads or screenshots'],
                ['📍', 'Login Tracking', 'Every login logged with IP & device'],
              ].map(([icon, title, desc], i) => (
                <div key={i} style={{ ...s.feature, animationDelay: `${0.2 + i * 0.15}s`, animation: 'fadeUp 0.6s ease forwards', opacity: 0 }}>
                  <span style={s.featureIcon}>{icon}</span>
                  <div>
                    <div style={s.featureTitle}>{title}</div>
                    <div style={s.featureDesc}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="login-right" style={{ ...s.right, opacity: mounted ? 1 : 0, animation: mounted ? 'slideInRight 0.7s ease forwards' : 'none' }}>
          <div style={s.card}>
            {/* Logo — only visible on mobile */}
            <div className="mobile-logo-wrap">
              <Image src="/logo.png" alt="YourHappyLife" width={130} height={44} style={{ objectFit:'contain' }} priority />
            </div>

            {/* Geo requesting */}
            {geoState === 'requesting' && (
              <div style={s.geoBox}>
                <div style={s.geoSpinner} />
                <div>
                  <div style={s.geoTitle}>Requesting location access…</div>
                  <div style={s.geoSub}>Please allow location access in your browser prompt to continue.</div>
                </div>
              </div>
            )}

            {/* Geo denied */}
            {geoState === 'denied' && (
              <div style={s.deniedBox}>
                <div style={{ fontSize:40, marginBottom:16 }}>📍</div>
                <h2 style={s.deniedTitle}>Location access required</h2>
                <p style={s.deniedSub}>
                  This portal requires location access for security logging. Please refresh the page and <strong>Allow</strong> when prompted.
                </p>
                <button onClick={() => window.location.reload()} style={s.refreshBtn}>
                  🔄 Refresh & Allow Location
                </button>
                <p style={s.deniedHint}>
                  If the prompt doesn't appear, tap the lock icon in your browser's address bar and enable Location.
                </p>
              </div>
            )}

            {/* Login form — shown only when geo is granted */}
            {geoState === 'granted' && (
              <>
                <div style={s.cardHeader}>
                  <div style={s.lockIcon}>🔒</div>
                  <h2 style={s.h2}>Welcome back</h2>
                  <p style={s.sub}>Sign in with your @yourhappylife.com email</p>
                </div>

                <form onSubmit={handleSubmit} style={s.form}>
                  <div style={s.inputWrap}>
                    <label style={s.label}>Company Email</label>
                    <div style={s.inputRow}>
                      <span style={s.inputIcon}>✉️</span>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@yourhappylife.com"
                        style={s.input}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <div style={s.errBox}>
                      <span>⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  <button type="submit" style={{ ...s.btn, ...(loading ? s.btnLoading : {}) }} disabled={loading}>
                    {loading ? (
                      <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                        <span style={s.btnSpinner} />
                        Sending OTP…
                      </span>
                    ) : 'Send One-Time Password →'}
                  </button>
                </form>

                <div style={s.divider}><span style={s.dividerText}>Secure Access</span></div>
                <p style={s.note}>Only @yourhappylife.com addresses are permitted. A 6-digit code will be sent to your inbox.</p>
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
  leftInner: { display:'flex', flexDirection:'column', gap:40, maxWidth:420 },
  tagline: { fontSize:'clamp(28px,3vw,44px)', fontWeight:800, color:'#fff', lineHeight:1.15, marginBottom:16 },
  tagSub: { fontSize:15, color:'rgba(255,255,255,0.75)', lineHeight:1.8 },
  featureList: { display:'flex', flexDirection:'column', gap:16 },
  feature: { display:'flex', alignItems:'flex-start', gap:14, background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'14px 16px', backdropFilter:'blur(8px)' },
  featureIcon: { fontSize:22, flexShrink:0 },
  featureTitle: { fontSize:14, fontWeight:700, color:'#fff', marginBottom:2 },
  featureDesc: { fontSize:12, color:'rgba(255,255,255,0.65)' },
  right: { width:'480px', minWidth:'320px', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px' },
  card: { width:'100%', maxWidth:400 },
  cardHeader: { textAlign:'center', marginBottom:36 },
  lockIcon: { fontSize:48, marginBottom:12, display:'block', animation:'pulse 3s ease-in-out infinite' },
  h2: { fontSize:28, fontWeight:800, color:'#1a1a2e', marginBottom:8 },
  sub: { fontSize:13, color:'#888', lineHeight:1.6 },
  form: { display:'flex', flexDirection:'column', gap:20 },
  inputWrap: { display:'flex', flexDirection:'column', gap:8 },
  label: { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'1px' },
  inputRow: { display:'flex', alignItems:'center', border:'2px solid #FADADD', borderRadius:12, background:'#FFF8F8', overflow:'hidden', transition:'border-color 0.2s' },
  inputIcon: { padding:'0 14px', fontSize:16 },
  input: { flex:1, padding:'14px 14px 14px 0', border:'none', background:'transparent', fontSize:16, outline:'none', fontFamily:"'Syne',sans-serif", color:'#1a1a2e', touchAction:'manipulation' },
  errBox: { display:'flex', alignItems:'center', gap:8, background:'#FFF0F2', border:'1.5px solid #FADADD', borderRadius:10, padding:'12px 14px', color:'#BF0426', fontSize:13, fontWeight:600 },
  btn: { width:'100%', padding:16, background:'linear-gradient(135deg, #BF0426, #8C001B)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'Syne',sans-serif", transition:'all 0.2s', boxShadow:'0 4px 16px rgba(191,4,38,0.35)', touchAction:'manipulation' },
  btnLoading: { opacity:0.8, cursor:'not-allowed' },
  btnSpinner: { width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' },
  divider: { display:'flex', alignItems:'center', margin:'28px 0 20px', gap:12 },
  dividerText: { fontSize:11, color:'#ccc', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', whiteSpace:'nowrap', padding:'0 12px', border:'1px solid #f0f0f0', borderRadius:20 },
  note: { fontSize:11, color:'#bbb', textAlign:'center', lineHeight:1.7 },
  // Geo states
  geoBox: { display:'flex', alignItems:'flex-start', gap:16, background:'#FFF8F8', border:'1.5px solid #FADADD', borderRadius:14, padding:'20px 18px' },
  geoSpinner: { width:22, height:22, border:'2.5px solid #FADADD', borderTop:'2.5px solid #BF0426', borderRadius:'50%', flexShrink:0, animation:'spin 0.8s linear infinite', marginTop:2 },
  geoTitle: { fontSize:14, fontWeight:700, color:'#BF0426', marginBottom:4 },
  geoSub: { fontSize:12, color:'#888', lineHeight:1.6 },
  deniedBox: { textAlign:'center', padding:'8px 0' },
  deniedTitle: { fontSize:22, fontWeight:800, color:'#1a1a2e', marginBottom:12 },
  deniedSub: { fontSize:14, color:'#555', lineHeight:1.7, marginBottom:24 },
  refreshBtn: { width:'100%', padding:'14px', background:'linear-gradient(135deg, #BF0426, #8C001B)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'Syne',sans-serif", boxShadow:'0 4px 16px rgba(191,4,38,0.35)', marginBottom:16, touchAction:'manipulation' },
  deniedHint: { fontSize:11, color:'#bbb', lineHeight:1.7 },
};
