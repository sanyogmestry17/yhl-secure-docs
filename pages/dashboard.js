import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function Dashboard() {
  const [pdfs, setPdfs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeFolder, setActiveFolder] = useState(null); // null = all docs
  const [dataLoaded, setDataLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.error) { router.push('/'); return; }
      setUser(d.user);
      setIsAdmin(!!d.isAdmin);
      setMounted(true);
    });
    fetch('/api/pdf/list').then(r => r.json()).then(d => {
      if (d.pdfs) setPdfs(d.pdfs);
      if (d.folders) setFolders(d.folders);
      setDataLoaded(true);
    });
  }, []);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  };

  // Filter PDFs based on active folder
  const visiblePdfs = activeFolder === null
    ? pdfs
    : activeFolder === '__none__'
    ? pdfs.filter(p => !p.folderId)
    : pdfs.filter(p => p.folderId === activeFolder);

  const hasUncategorised = pdfs.some(p => !p.folderId);

  return (
    <>
      <Head>
        <title>Documents — YourHappyLife</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={s.wrap}>
        {/* Nav */}
        <nav className="dash-nav" style={s.nav}>
          <Image src="/logo.png" alt="YourHappyLife" width={140} height={48} style={{ objectFit:'contain' }} />
          <div style={s.navR}>
            {user && (
              <div className="dash-user-pill" style={s.userPill}>
                <div style={s.userDot} />
                <span style={s.userEmail}>{user.email}</span>
              </div>
            )}
            {isAdmin && (
              <button className="dash-admin-btn" onClick={() => router.push('/admin')} style={s.adminBtn}>
                ⚙️ Admin
              </button>
            )}
            <button className="dash-logout-btn" onClick={logout} style={s.logoutBtn}>
              Sign out
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="dash-hero" style={s.hero}>
          <div style={s.heroInner}>
            <div style={{ animation: mounted ? 'fadeUp 0.6s ease forwards' : 'none', opacity: mounted ? 1 : 0 }}>
              <div style={s.heroBadge}>🔒 Internal Portal</div>
              <h1 style={s.h1}>Company Documents</h1>
              <p style={s.heroSub}>Secure, view-only access. All sessions are logged with your IP and device information.</p>
            </div>
            {user && (
              <div style={{ ...s.loginInfo, animation: mounted ? 'fadeUp 0.6s 0.2s ease forwards' : 'none', opacity: 0 }}>
                <span>📍 Last login: {user.loginTime}</span>
                <span style={s.dot}>•</span>
                <span>🌐 IP: {user.ip}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <main className="dash-main" style={s.main}>

          {/* Folder filter bar skeleton */}
          {!dataLoaded && (
            <div style={{ display:'flex', gap:8, marginBottom:28, flexWrap:'wrap' }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height:36, width: i === 1 ? 60 : 120, borderRadius:20 }} />
              ))}
            </div>
          )}

          {/* Folder filter bar */}
          {dataLoaded && folders.length > 0 && (
            <div style={s.folderBar}>
              <button
                style={{ ...s.folderChip, ...(activeFolder === null ? s.folderChipActive : {}) }}
                onClick={() => setActiveFolder(null)}
              >All</button>
              {hasUncategorised && (
                <button
                  style={{ ...s.folderChip, ...(activeFolder === '__none__' ? s.folderChipActive : {}) }}
                  onClick={() => setActiveFolder('__none__')}
                >📂 Uncategorised</button>
              )}
              {folders.map(f => (
                <button
                  key={f.id}
                  style={{ ...s.folderChip, ...(activeFolder === f.id ? s.folderChipActive : {}) }}
                  onClick={() => setActiveFolder(f.id)}
                >📁 {f.name}</button>
              ))}
            </div>
          )}

          {!dataLoaded ? (
            <div className="dash-grid" style={s.grid}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ ...s.card, cursor:'default', animation:'none', opacity:1 }}>
                  <div style={s.cardTop}>
                    <div className="skeleton" style={{ width:52, height:52, borderRadius:12 }} />
                    <div className="skeleton" style={{ width:72, height:26, borderRadius:20 }} />
                  </div>
                  <div className="skeleton" style={{ height:20, borderRadius:6, marginTop:4 }} />
                  <div className="skeleton" style={{ height:20, width:'60%', borderRadius:6 }} />
                  <div className="skeleton" style={{ height:46, borderRadius:10, marginTop:8 }} />
                </div>
              ))}
            </div>
          ) : visiblePdfs.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize:56, marginBottom:16, animation:'float 3s ease-in-out infinite' }}>📂</div>
              <p style={s.emptyText}>{pdfs.length === 0 ? 'No documents available yet.' : 'No documents in this folder.'}</p>
              <p style={s.emptySub}>{pdfs.length === 0 ? 'Contact your administrator to add documents.' : 'Select a different folder above.'}</p>
            </div>
          ) : (
            <div className="dash-grid" style={s.grid}>
              {visiblePdfs.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    ...s.card,
                    animation: mounted ? `fadeUp 0.5s ${0.1 + i * 0.08}s ease forwards` : 'none',
                    opacity: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(191,4,38,0.12)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)';
                  }}
                >
                  <div style={s.cardTop}>
                    <div style={s.fileIconWrap}>
                      <span style={{ fontSize:28 }}>📄</span>
                    </div>
                    <span style={s.viewBadge}>View only</span>
                  </div>
                  <h3 style={s.cardTitle}>{p.title || p.name}</h3>
                  {p.folderId && folders.length > 0 && (
                    <p style={s.cardFolder}>📁 {folders.find(f => f.id === p.folderId)?.name}</p>
                  )}
                  <button
                    onClick={() => router.push(`/viewer/${p.id}`)}
                    style={s.openBtn}
                    onMouseEnter={e => e.currentTarget.style.background = '#8C001B'}
                    onMouseLeave={e => e.currentTarget.style.background = '#BF0426'}
                  >
                    Open Document →
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={s.footer}>
          <span>© {new Date().getFullYear()} YourHappyLife. All access is monitored.</span>
          <span style={s.dot}>•</span>
          <span>🔒 Secure Portal</span>
        </footer>
      </div>
    </>
  );
}

const s = {
  wrap: { minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Syne',sans-serif", display:'flex', flexDirection:'column' },
  nav: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 40px', background:'#fff', borderBottom:'2px solid #FFF0F2', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' },
  navR: { display:'flex', alignItems:'center', gap:12 },
  userPill: { display:'flex', alignItems:'center', gap:8, background:'#FFF0F2', border:'1.5px solid #FADADD', borderRadius:20, padding:'6px 14px' },
  userDot: { width:8, height:8, borderRadius:'50%', background:'#22c55e', flexShrink:0 },
  userEmail: { color:'#BF0426', fontSize:12, fontWeight:700 },
  adminBtn: { padding:'8px 16px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  logoutBtn: { padding:'8px 20px', background:'#BF0426', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", transition:'background 0.2s' },
  hero: { background:'linear-gradient(135deg, #BF0426 0%, #8C001B 100%)', padding:'48px 40px' },
  heroInner: { maxWidth:1060, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 },
  heroBadge: { display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:20, marginBottom:12, backdropFilter:'blur(8px)' },
  h1: { fontSize:'clamp(24px,3vw,38px)', fontWeight:800, color:'#fff', marginBottom:10 },
  heroSub: { fontSize:14, color:'rgba(255,255,255,0.75)', maxWidth:560, lineHeight:1.7 },
  loginInfo: { display:'flex', alignItems:'center', gap:12, fontSize:12, color:'rgba(255,255,255,0.6)', flexWrap:'wrap' },
  dot: { color:'rgba(255,255,255,0.3)' },
  main: { maxWidth:1100, margin:'0 auto', padding:'40px', width:'100%', flex:1 },
  folderBar: { display:'flex', gap:8, marginBottom:28, flexWrap:'wrap' },
  folderChip: { padding:'8px 16px', borderRadius:20, border:'1.5px solid #e0e0e0', background:'#fff', color:'#666', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Syne',sans-serif", transition:'all 0.2s', whiteSpace:'nowrap' },
  folderChipActive: { background:'#BF0426', color:'#fff', border:'1.5px solid #BF0426' },
  empty: { textAlign:'center', padding:'80px 0' },
  emptyText: { fontSize:18, fontWeight:700, color:'#444', marginBottom:8 },
  emptySub: { fontSize:14, color:'#aaa' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:24 },
  card: { background:'#fff', borderRadius:16, padding:28, boxShadow:'0 2px 16px rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', gap:14, border:'1.5px solid #f5f5f5', transition:'all 0.25s ease', cursor:'pointer' },
  cardTop: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  fileIconWrap: { width:52, height:52, background:'#FFF0F2', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' },
  viewBadge: { background:'#FFF0F2', color:'#BF0426', fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20, border:'1px solid #FADADD' },
  cardTitle: { fontSize:17, fontWeight:700, color:'#1a1a2e' },
  cardFolder: { fontSize:12, color:'#aaa', marginTop:-8 },
  openBtn: { padding:'13px', background:'#BF0426', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14, fontFamily:"'Syne',sans-serif", transition:'background 0.2s', textAlign:'center' },
  footer: { textAlign:'center', padding:'20px', fontSize:12, color:'#bbb', display:'flex', justifyContent:'center', alignItems:'center', gap:10, borderTop:'1px solid #f0f0f0', flexWrap:'wrap' },
};
