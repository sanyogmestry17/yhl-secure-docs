import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

const PDFJS_VERSION = '2.16.105';

export default function ViewerPage() {
  const router = useRouter();
  const { id } = router.query;
  const containerRef = useRef(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const didRender = useRef(false);

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.error) { router.push('/'); return; }
      setUser(d.user);
    }).catch(() => router.push('/'));
  }, []);

  useEffect(() => {
    if (!id || !user || didRender.current) return;
    didRender.current = true;
    setStatus('Loading PDF viewer…');
    loadScript(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`)
      .then(() => { setStatus('Fetching document…'); return renderPDF(); })
      .catch(err => { setError(err.message || 'Unknown error'); });
  }, [id, user]);

  useEffect(() => {
    // Block Safari swipe-back navigation — push a duplicate history entry so
    // the back gesture stays on this page instead of navigating away.
    window.history.pushState(null, '', window.location.href);
    const lockHistory = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', lockHistory);

    const block = e => e.preventDefault();
    const blockKeys = e => {
      if ((e.ctrlKey || e.metaKey) && ['s','p','c','a','u'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('keydown', blockKeys);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const devCheck = setInterval(() => {
      if (isMobile) return;
      const open = window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 200;
      if (containerRef.current) containerRef.current.style.filter = open ? 'blur(24px)' : 'none';
    }, 800);
    const onHide = () => {
      if (containerRef.current) containerRef.current.style.filter = document.hidden ? 'blur(24px)' : 'none';
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('popstate', lockHistory);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('visibilitychange', onHide);
      clearInterval(devCheck);
    };
  }, []);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(s);
    });
  }

  async function renderPDF() {
    const lib = window.pdfjsLib;
    if (!lib) throw new Error('PDF.js not available');
    lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

    const res = await fetch(`/api/pdf/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const buffer = await res.arrayBuffer();
    const header = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    if (!header.startsWith('%PDF')) throw new Error(`Not a valid PDF (got: ${header})`);

    const pdf = await lib.getDocument({ data: buffer }).promise;
    setTotalPages(pdf.numPages);
    const container = containerRef.current;
    if (!container) throw new Error('Container missing');
    container.innerHTML = '';

    const scale = window.innerWidth < 600 ? 1.0 : window.innerWidth < 900 ? 1.3 : 1.6;
    const BATCH_SIZE = 4;

    // Pre-allocate DOM slots in order so pages always appear in sequence
    const slots = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const wrap = document.createElement('div');
      wrap.style.cssText = `margin:0 auto 24px;width:100%;box-shadow:0 4px 32px rgba(0,0,0,0.15);border-radius:10px;overflow:hidden;background:#f0f0f0;min-height:200px;`;
      container.appendChild(wrap);
      slots.push(wrap);
    }

    let rendered = 0;

    async function renderPage(p) {
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale });
      const wrap = slots[p - 1];

      wrap.style.cssText = `margin:0 auto 24px;width:100%;max-width:${vp.width}px;box-shadow:0 4px 32px rgba(0,0,0,0.15);border-radius:10px;overflow:hidden;background:#fff;animation:fadeUp 0.4s ease forwards;`;

      const pageLabel = document.createElement('div');
      pageLabel.style.cssText = `background:#f8f8f8;border-bottom:1px solid #f0f0f0;padding:8px 16px;font-size:11px;color:#aaa;font-family:'Syne',sans-serif;font-weight:600;letter-spacing:1px;`;
      pageLabel.textContent = `PAGE ${p} OF ${pdf.numPages}`;

      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      canvas.style.cssText = 'display:block;width:100%;';

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      // Watermark
      ctx.save();
      ctx.globalAlpha = 0.055;
      ctx.fillStyle = '#BF0426';
      ctx.font = `bold ${Math.floor(vp.width / 40)}px Arial`;
      ctx.textAlign = 'center';
      ctx.translate(vp.width / 2, vp.height / 2);
      ctx.rotate(-35 * Math.PI / 180);
      const wm = `CONFIDENTIAL • ${user.email}`;
      for (let y = -vp.height; y < vp.height; y += 180)
        for (let x = -vp.width; x < vp.width; x += 520)
          ctx.fillText(wm, x, y);
      ctx.restore();

      wrap.appendChild(pageLabel);
      wrap.appendChild(canvas);

      rendered++;
      setCurrentPage(rendered);
      setStatus(`Rendering page ${rendered} of ${pdf.numPages}…`);
    }

    // Render in batches of BATCH_SIZE concurrently
    for (let p = 1; p <= pdf.numPages; p += BATCH_SIZE) {
      const batch = [];
      for (let i = p; i <= Math.min(p + BATCH_SIZE - 1, pdf.numPages); i++) {
        batch.push(renderPage(i));
      }
      await Promise.all(batch);
    }

    setDone(true);
  }

  const progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <>
      <Head>
        <title>Viewing Document — YourHappyLife</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;}
        canvas{pointer-events:none;display:block;touch-action:pan-x pan-y pinch-zoom;}
        img{-webkit-touch-callout:none!important;pointer-events:none;}
        @media print{body{display:none!important;}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes progressBar{from{width:0;}to{width:100%;}}
        html,body{overscroll-behavior:none;}
      `}</style>

      <div style={s.wrap}>
        {/* Sticky nav */}
        <nav className="viewer-nav" style={s.nav}>
          <div style={s.navL}>
            <button onClick={() => router.push('/dashboard')} style={s.back}>← Back</button>
            <Image className="viewer-logo" src="/logo.png" alt="YourHappyLife" width={110} height={36} style={{ objectFit:'contain' }} />
          </div>
          <div style={s.navR}>
            <div className="viewer-protected-badge" style={s.protectedBadge}>🔒 Protected</div>
            {user && <div className="viewer-user-badge" style={s.userBadge}>{user.email}</div>}
          </div>
        </nav>

        {/* Loading progress bar */}
        {!done && !error && (
          <div style={s.progressOuter}>
            <div style={{ ...s.progressBar, width: `${progress}%`, transition:'width 0.3s ease' }} />
          </div>
        )}

        <div className="viewer-area" style={s.area}>
          {!done && !error && (
            <div style={s.center}>
              <div style={s.spinnerWrap}>
                <div style={s.spinner} />
                <div style={s.spinnerLogo}>📄</div>
              </div>
              <p style={s.statusText}>{status}</p>
              {totalPages > 0 && (
                <p style={s.statusSub}>Page {currentPage} of {totalPages} — {progress}%</p>
              )}
            </div>
          )}

          {error && (
            <div style={s.center}>
              <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
              <p style={s.errTitle}>Could not load document</p>
              <p style={s.errSub}>{error}</p>
              <button onClick={() => router.push('/dashboard')} style={s.back}>← Back to documents</button>
            </div>
          )}

          <div ref={containerRef} style={{ display: 'block', width:'100%', maxWidth:900, margin:'0 auto' }} />

          {done && (
            <div style={s.doneFooter}>
              <span>✅ {totalPages} page{totalPages !== 1 ? 's' : ''} loaded</span>
              <span style={{ color:'#ddd' }}>•</span>
              <span>🔒 Watermarked with {user?.email}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const s = {
  wrap: { minHeight:'100vh', background:'#f2f2f2', fontFamily:"'Syne',sans-serif" },
  nav: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 32px', background:'#fff', borderBottom:'2px solid #FFF0F2', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' },
  navL: { display:'flex', alignItems:'center', gap:16 },
  navR: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'flex-end' },
  back: { background:'transparent', border:'1.5px solid #FADADD', color:'#BF0426', padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", whiteSpace:'nowrap' },
  protectedBadge: { background:'#FFF0F2', color:'#BF0426', padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:700, border:'1px solid #FADADD', whiteSpace:'nowrap' },
  userBadge: { background:'#f5f5f5', color:'#888', padding:'5px 12px', borderRadius:20, fontSize:11, border:'1px solid #eee', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  progressOuter: { height:3, background:'#FFF0F2', width:'100%' },
  progressBar: { height:'100%', background:'linear-gradient(90deg, #BF0426, #ff4d6d)', borderRadius:2, transition:'width 0.3s ease' },
  area: { padding:'36px 24px', minHeight:'calc(100vh - 60px)' },
  center: { textAlign:'center', padding:'80px 20px' },
  spinnerWrap: { position:'relative', width:72, height:72, margin:'0 auto 24px' },
  spinner: { width:72, height:72, border:'3px solid #FADADD', borderTop:'3px solid #BF0426', borderRadius:'50%', animation:'spin 1s linear infinite', position:'absolute', top:0, left:0 },
  spinnerLogo: { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:28 },
  statusText: { color:'#BF0426', fontSize:15, fontWeight:700, marginBottom:8 },
  statusSub: { color:'#aaa', fontSize:13 },
  errTitle: { color:'#BF0426', fontSize:18, fontWeight:700, marginBottom:8 },
  errSub: { color:'#aaa', fontSize:13, fontFamily:'monospace', marginBottom:24 },
  doneFooter: { textAlign:'center', padding:'24px 0 8px', fontSize:12, color:'#bbb', display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' },
};