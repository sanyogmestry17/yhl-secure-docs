import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('documents');
  const [folders, setFolders] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Folder UI
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [folderRenameVal, setFolderRenameVal] = useState('');
  const [folderBusy, setFolderBusy] = useState(false);

  // PDF UI
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [renamingPdf, setRenamingPdf] = useState(null);
  const [pdfRenameVal, setPdfRenameVal] = useState('');
  const [pdfMoveFolderId, setPdfMoveFolderId] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.error || !d.isAdmin) { router.push('/dashboard'); return; }
      setUser(d.user);
      loadData();
    }).catch(() => router.push('/dashboard'));
  }, []);

  async function loadData() {
    setLoading(true);
    const r = await fetch('/api/pdf/list');
    const d = await r.json();
    setFolders(d.folders || []);
    setPdfs(d.pdfs || []);
    setLoading(false);
  }

  // ─── Folder actions ───────────────────────────────────────────────────────

  async function createFolder() {
    if (!newFolderName.trim()) return;
    setFolderBusy(true);
    const r = await fetch('/api/admin/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    if (r.ok) { setNewFolderName(''); await loadData(); }
    setFolderBusy(false);
  }

  async function renameFolder() {
    if (!folderRenameVal.trim()) return;
    setFolderBusy(true);
    await fetch(`/api/admin/folders/${renamingFolder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderRenameVal.trim() }),
    });
    setRenamingFolder(null);
    await loadData();
    setFolderBusy(false);
  }

  async function deleteFolder(id, name) {
    if (!confirm(`Delete folder "${name}"? Documents in it will become uncategorised.`)) return;
    await fetch(`/api/admin/folders/${id}`, { method: 'DELETE' });
    await loadData();
  }

  // ─── PDF actions ──────────────────────────────────────────────────────────

  async function uploadPDF() {
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    setUploadProgress('Reading file…');
    try {
      const fileBase64 = await fileToBase64(uploadFile);
      setUploadProgress('Uploading to storage…');
      const r = await fetch('/api/admin/pdfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName.trim(),
          folderId: uploadFolder || null,
          fileBase64,
          fileName: uploadFile.name,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      setShowUpload(false);
      setUploadFile(null);
      setUploadName('');
      setUploadFolder('');
      await loadData();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
    setUploadProgress('');
  }

  async function renamePdf() {
    if (!pdfRenameVal.trim()) return;
    setPdfBusy(true);
    await fetch(`/api/admin/pdfs/${renamingPdf.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pdfRenameVal.trim(), folderId: pdfMoveFolderId === '__none__' ? null : pdfMoveFolderId || renamingPdf.folderId }),
    });
    setRenamingPdf(null);
    await loadData();
    setPdfBusy(false);
  }

  async function deletePdf(id, name, source) {
    if (!confirm(`Delete document "${name}"? This cannot be undone.`)) return;
    if (source === 'filesystem') { alert('Filesystem PDFs can only be deleted from the server directly.'); return; }
    await fetch(`/api/admin/pdfs/${id}`, { method: 'DELETE' });
    await loadData();
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function folderName(id) {
    if (!id) return '—';
    return folders.find(f => f.id === id)?.name || '—';
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", background:'#f7f7f7' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⚙️</div>
          <p style={{ color:'#BF0426', fontWeight:700 }}>Loading admin panel…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin — YourHappyLife</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={s.wrap}>

        {/* Nav */}
        <nav style={s.nav}>
          <div style={s.navL}>
            <Image src="/logo.png" alt="YourHappyLife" width={130} height={44} style={{ objectFit:'contain' }} />
            <span style={s.adminBadge}>Admin Panel</span>
          </div>
          <div style={s.navR}>
            <button onClick={() => router.push('/dashboard')} style={s.backBtn}>← Dashboard</button>
          </div>
        </nav>

        <div style={s.content}>
          <h1 style={s.h1}>Document Management</h1>
          <p style={s.sub}>Manage folders and documents. Only visible to {user?.email}.</p>

          {/* Tabs */}
          <div style={s.tabs}>
            <button
              style={{ ...s.tabBtn, ...(tab === 'folders' ? s.tabActive : {}) }}
              onClick={() => setTab('folders')}
            >📁 Folders ({folders.length})</button>
            <button
              style={{ ...s.tabBtn, ...(tab === 'documents' ? s.tabActive : {}) }}
              onClick={() => setTab('documents')}
            >📄 Documents ({pdfs.length})</button>
          </div>

          {/* ── Folders Tab ── */}
          {tab === 'folders' && (
            <div>
              {/* Create folder */}
              <div style={s.createRow}>
                <input
                  style={s.input}
                  placeholder="New folder name…"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createFolder()}
                />
                <button style={s.primaryBtn} onClick={createFolder} disabled={folderBusy || !newFolderName.trim()}>
                  + Create Folder
                </button>
              </div>

              {folders.length === 0 ? (
                <div style={s.empty}>No folders yet. Create one above.</div>
              ) : (
                <div style={s.table}>
                  <div style={s.thead}>
                    <span style={{ flex:1 }}>Folder Name</span>
                    <span style={{ width:180, textAlign:'right' }}>Actions</span>
                  </div>
                  {folders.map(f => (
                    <div key={f.id} style={s.trow}>
                      {renamingFolder?.id === f.id ? (
                        <input
                          style={{ ...s.input, flex:1, marginRight:8 }}
                          value={folderRenameVal}
                          onChange={e => setFolderRenameVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameFolder(); if (e.key === 'Escape') setRenamingFolder(null); }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ flex:1, fontWeight:600, color:'#1a1a2e' }}>📁 {f.name}</span>
                      )}
                      <div style={s.actions}>
                        {renamingFolder?.id === f.id ? (
                          <>
                            <button style={s.saveBtn} onClick={renameFolder} disabled={folderBusy}>Save</button>
                            <button style={s.cancelBtn} onClick={() => setRenamingFolder(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button style={s.editBtn} onClick={() => { setRenamingFolder(f); setFolderRenameVal(f.name); }}>Rename</button>
                            <button style={s.deleteBtn} onClick={() => deleteFolder(f.id, f.name)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Documents Tab ── */}
          {tab === 'documents' && (
            <div>
              <div style={s.createRow}>
                <button style={s.primaryBtn} onClick={() => setShowUpload(true)}>⬆ Upload PDF</button>
              </div>

              {pdfs.length === 0 ? (
                <div style={s.empty}>No documents yet. Upload one above.</div>
              ) : (
                <div style={s.table}>
                  <div style={s.thead}>
                    <span style={{ flex:1 }}>Document Name</span>
                    <span style={{ width:140 }}>Folder</span>
                    <span style={{ width:80 }}>Source</span>
                    <span style={{ width:200, textAlign:'right' }}>Actions</span>
                  </div>
                  {pdfs.map(p => (
                    <div key={p.id} style={s.trow}>
                      {renamingPdf?.id === p.id ? (
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, marginRight:8 }}>
                          <input
                            style={s.input}
                            value={pdfRenameVal}
                            onChange={e => setPdfRenameVal(e.target.value)}
                            placeholder="Display name"
                            onKeyDown={e => e.key === 'Enter' && renamePdf()}
                            autoFocus
                          />
                          <select style={s.select} value={pdfMoveFolderId} onChange={e => setPdfMoveFolderId(e.target.value)}>
                            <option value="">Keep current folder ({folderName(p.folderId)})</option>
                            <option value="__none__">No folder (uncategorised)</option>
                            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                      ) : (
                        <span style={{ flex:1, fontWeight:600, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
                          📄 {p.title || p.name}
                        </span>
                      )}
                      <span style={{ width:140, color:'#888', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {folderName(p.folderId)}
                      </span>
                      <span style={{ width:80 }}>
                        <span style={{ ...s.sourceBadge, ...(p.source === 'blob' ? s.blobBadge : s.fsBadge) }}>
                          {p.source === 'blob' ? 'Cloud' : 'Local'}
                        </span>
                      </span>
                      <div style={{ ...s.actions, width:200 }}>
                        {renamingPdf?.id === p.id ? (
                          <>
                            <button style={s.saveBtn} onClick={renamePdf} disabled={pdfBusy}>Save</button>
                            <button style={s.cancelBtn} onClick={() => setRenamingPdf(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              style={s.editBtn}
                              onClick={() => { setRenamingPdf(p); setPdfRenameVal(p.title || p.name); setPdfMoveFolderId(''); }}
                            >Edit</button>
                            <button style={s.deleteBtn} onClick={() => deletePdf(p.id, p.title || p.name, p.source)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div style={s.modalOverlay} onClick={e => { if (e.target === e.currentTarget && !uploading) setShowUpload(false); }}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Upload PDF</h2>

            <label style={s.label}>PDF File</label>
            <div
              style={{ ...s.dropZone, ...(uploadFile ? s.dropZoneActive : {}) }}
              onClick={() => fileRef.current?.click()}
            >
              {uploadFile ? (
                <span style={{ color:'#BF0426', fontWeight:600 }}>📄 {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</span>
              ) : (
                <span style={{ color:'#aaa' }}>Click to select a PDF file (max 50 MB)</span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                style={{ display:'none' }}
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) { setUploadFile(f); if (!uploadName) setUploadName(f.name.replace(/\.pdf$/i, '')); }
                }}
              />
            </div>

            <label style={s.label}>Display Name</label>
            <input
              style={s.input}
              placeholder="e.g. Q1 2025 Report"
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
            />

            <label style={s.label}>Folder (optional)</label>
            <select style={s.select} value={uploadFolder} onChange={e => setUploadFolder(e.target.value)}>
              <option value="">No folder</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>

            {uploadProgress && <p style={{ color:'#BF0426', fontSize:13, fontWeight:600, marginTop:8 }}>⏳ {uploadProgress}</p>}

            <div style={{ display:'flex', gap:12, marginTop:20 }}>
              <button
                style={{ ...s.primaryBtn, flex:1, opacity: (uploading || !uploadFile || !uploadName.trim()) ? 0.5 : 1 }}
                onClick={uploadPDF}
                disabled={uploading || !uploadFile || !uploadName.trim()}
              >
                {uploading ? 'Uploading…' : '⬆ Upload'}
              </button>
              <button style={{ ...s.cancelBtn, padding:'12px 20px' }} onClick={() => !uploading && setShowUpload(false)} disabled={uploading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  wrap: { minHeight:'100vh', background:'#f7f7f7', fontFamily:"'Syne',sans-serif" },
  nav: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 40px', background:'#fff', borderBottom:'2px solid #FFF0F2', boxShadow:'0 2px 12px rgba(0,0,0,0.04)', position:'sticky', top:0, zIndex:100 },
  navL: { display:'flex', alignItems:'center', gap:14 },
  navR: {},
  adminBadge: { background:'#BF0426', color:'#fff', fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:20, letterSpacing:'0.5px', textTransform:'uppercase' },
  backBtn: { background:'transparent', border:'1.5px solid #FADADD', color:'#BF0426', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  content: { maxWidth:1100, margin:'0 auto', padding:'40px 24px' },
  h1: { fontSize:'clamp(22px,3vw,32px)', fontWeight:800, color:'#1a1a2e', marginBottom:6 },
  sub: { fontSize:13, color:'#888', marginBottom:32 },
  tabs: { display:'flex', gap:8, marginBottom:28 },
  tabBtn: { padding:'10px 20px', borderRadius:10, border:'1.5px solid #e0e0e0', background:'#fff', color:'#888', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:"'Syne',sans-serif", transition:'all 0.2s' },
  tabActive: { background:'#BF0426', color:'#fff', border:'1.5px solid #BF0426' },
  createRow: { display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' },
  input: { flex:1, minWidth:160, padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:8, fontSize:14, fontFamily:"'Syne',sans-serif", outline:'none', background:'#fff' },
  select: { flex:1, minWidth:160, padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:8, fontSize:14, fontFamily:"'Syne',sans-serif", outline:'none', background:'#fff', cursor:'pointer' },
  primaryBtn: { padding:'12px 20px', background:'#BF0426', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", whiteSpace:'nowrap', transition:'background 0.2s' },
  editBtn: { padding:'7px 14px', background:'#f0f0f0', color:'#444', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  deleteBtn: { padding:'7px 14px', background:'#FFF0F2', color:'#BF0426', border:'1px solid #FADADD', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  saveBtn: { padding:'7px 14px', background:'#BF0426', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  cancelBtn: { padding:'7px 14px', background:'#f5f5f5', color:'#666', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  empty: { textAlign:'center', padding:'60px 0', color:'#bbb', fontSize:15 },
  table: { background:'#fff', borderRadius:14, border:'1.5px solid #f0f0f0', overflow:'hidden' },
  thead: { display:'flex', alignItems:'center', padding:'12px 20px', background:'#f8f8f8', borderBottom:'1px solid #f0f0f0', fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', gap:12 },
  trow: { display:'flex', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #f8f8f8', gap:12, minHeight:60, flexWrap:'wrap' },
  actions: { display:'flex', gap:8, justifyContent:'flex-end', flexShrink:0 },
  sourceBadge: { fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:12 },
  blobBadge: { background:'#e8f5e9', color:'#2e7d32' },
  fsBadge: { background:'#e3f2fd', color:'#1565c0' },
  // Modal
  modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 },
  modal: { background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:480, boxShadow:'0 24px 64px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', gap:10 },
  modalTitle: { fontSize:20, fontWeight:800, color:'#1a1a2e', marginBottom:8 },
  label: { fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px' },
  dropZone: { border:'2px dashed #e0e0e0', borderRadius:10, padding:'24px 16px', textAlign:'center', cursor:'pointer', transition:'border-color 0.2s', background:'#fafafa' },
  dropZoneActive: { borderColor:'#BF0426', background:'#FFF0F2' },
};
