import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('folders');
  const [folders, setFolders] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [folderPath, setFolderPath] = useState([]); // [{id, name}] trail

  // Folder UI
  const [newFolderName, setNewFolderName] = useState('');
  const [folderNameError, setFolderNameError] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [folderRenameVal, setFolderRenameVal] = useState('');
  const [folderRenameError, setFolderRenameError] = useState('');
  const [folderBusy, setFolderBusy] = useState(false);

  // PDF UI
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [renamingPdf, setRenamingPdf] = useState(null);
  const [pdfRenameVal, setPdfRenameVal] = useState('');
  const [pdfMoveFolderId, setPdfMoveFolderId] = useState('KEEP');
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
    const r = await fetch('/api/pdf/list');
    const d = await r.json();
    setFolders(d.folders || []);
    setPdfs(d.pdfs || []);
    setLoading(false);
  }

  // Current view: subfolders and docs at this level
  const subfolders = folders.filter(f => (f.parentId || null) === currentFolderId);
  const folderDocs = pdfs.filter(p => (p.folderId || null) === currentFolderId);

  function navigateInto(folder) {
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    setNewFolderName('');
    setFolderNameError('');
    setRenamingFolder(null);
    setRenamingPdf(null);
  }

  function navigateToBreadcrumb(idx) {
    if (idx === -1) {
      setFolderPath([]);
      setCurrentFolderId(null);
    } else {
      setFolderPath(prev => prev.slice(0, idx + 1));
      setCurrentFolderId(folderPath[idx].id);
    }
    setNewFolderName('');
    setFolderNameError('');
    setRenamingFolder(null);
    setRenamingPdf(null);
  }

  // ─── Folder actions ────────────────────────────────────────────────────────

  async function handleCreateFolder() {
    if (!newFolderName.trim()) {
      setFolderNameError('Folder name cannot be empty');
      return;
    }
    setFolderNameError('');
    setFolderBusy(true);
    const r = await fetch('/api/admin/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId }),
    });
    if (r.ok) {
      setNewFolderName('');
      await loadData();
    }
    setFolderBusy(false);
  }

  async function handleRenameFolder() {
    if (!folderRenameVal.trim()) {
      setFolderRenameError('Folder name cannot be empty');
      return;
    }
    setFolderRenameError('');
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

  async function handleDeleteFolder(id, name) {
    if (!confirm(`Delete "${name}" and all its subfolders? Documents inside will move to root.`)) return;
    await fetch(`/api/admin/folders/${id}`, { method: 'DELETE' });
    await loadData();
  }

  // ─── PDF actions ──────────────────────────────────────────────────────────

  function openUpload() {
    setUploadFolderId(currentFolderId || '');
    setUploadFile(null);
    setUploadName('');
    setShowUpload(true);
  }

  async function handleUploadPDF() {
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    setUploadProgress('Reading file…');
    try {
      const fileBase64 = await fileToBase64(uploadFile);
      setUploadProgress('Uploading to cloud storage…');
      const r = await fetch('/api/admin/pdfs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName.trim(),
          folderId: uploadFolderId || null,
          fileBase64,
          fileName: uploadFile.name,
        }),
      });
      let d;
      try {
        d = await r.json();
      } catch (parseErr) {
        throw new Error('Server returned invalid JSON response');
      }
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      setShowUpload(false);
      await loadData();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
    setUploadProgress('');
  }

  async function handleRenamePdf() {
    if (!pdfRenameVal.trim()) return;
    if (renamingPdf.source === 'filesystem') {
      alert('Local filesystem PDFs cannot be renamed or moved here. Manage them directly on the server.');
      return;
    }
    setPdfBusy(true);

    let newFolderId;
    if (pdfMoveFolderId === 'KEEP') newFolderId = renamingPdf.folderId;
    else if (pdfMoveFolderId === '__none__') newFolderId = null;
    else newFolderId = pdfMoveFolderId;

    const r = await fetch(`/api/admin/pdfs/${renamingPdf.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pdfRenameVal.trim(), folderId: newFolderId }),
    });
    const d = await r.json();
    if (!r.ok) alert('Error: ' + d.error);
    setRenamingPdf(null);
    await loadData();
    setPdfBusy(false);
  }

  async function handleDeletePdf(id, name, source) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    if (source === 'filesystem') {
      alert('Local files can only be deleted from the server directly.');
      return;
    }
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

  function getFolderLabel(id) {
    if (!id) return 'Root';
    return folders.find(f => f.id === id)?.name || '—';
  }

  // Flatten all folders for select dropdowns
  function renderFolderOptions(parentId = null, depth = 0) {
    return folders
      .filter(f => (f.parentId || null) === parentId)
      .flatMap(f => [
        <option key={f.id} value={f.id}>{'\u00A0'.repeat(depth * 3)}📁 {f.name}</option>,
        ...renderFolderOptions(f.id, depth + 1),
      ]);
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

  const currentFolderName = folderPath.length > 0 ? folderPath[folderPath.length - 1].name : 'Root';

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
          <button onClick={() => router.push('/dashboard')} style={s.backBtn}>← Dashboard</button>
        </nav>

        <div style={s.content}>
          <h1 style={s.h1}>Document Management</h1>
          <p style={s.sub}>Logged in as {user?.email}.</p>

          {/* Breadcrumb */}
          <div style={s.breadcrumb}>
            <button style={{ ...s.breadBtn, ...(folderPath.length === 0 ? s.breadBtnActive : {}) }} onClick={() => navigateToBreadcrumb(-1)}>
              🏠 Root
            </button>
            {folderPath.map((f, i) => (
              <span key={f.id} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                <span style={s.breadSep}>›</span>
                <button
                  style={{ ...s.breadBtn, ...(i === folderPath.length - 1 ? s.breadBtnActive : {}) }}
                  onClick={() => navigateToBreadcrumb(i)}
                >{f.name}</button>
              </span>
            ))}
          </div>

          {/* Tabs */}
          <div style={s.tabs}>
            <button style={{ ...s.tabBtn, ...(tab === 'folders' ? s.tabActive : {}) }} onClick={() => setTab('folders')}>
              📁 Folders ({subfolders.length})
            </button>
            <button style={{ ...s.tabBtn, ...(tab === 'documents' ? s.tabActive : {}) }} onClick={() => setTab('documents')}>
              📄 Documents ({folderDocs.length})
            </button>
          </div>

          {/* ─── Folders Tab ─── */}
          {tab === 'folders' && (
            <div>
              <div style={s.createRow}>
                <div style={{ flex:1, minWidth:200 }}>
                  <input
                    style={{ ...s.input, ...(folderNameError ? s.inputError : {}) }}
                    placeholder={currentFolderId ? `New subfolder inside "${currentFolderName}"…` : 'New folder name…'}
                    value={newFolderName}
                    onChange={e => { setNewFolderName(e.target.value); if (folderNameError) setFolderNameError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                  />
                  {folderNameError && (
                    <p style={s.errorMsg}>⚠ {folderNameError}</p>
                  )}
                </div>
                <button style={s.primaryBtn} onClick={handleCreateFolder} disabled={folderBusy}>
                  + {currentFolderId ? 'Create Subfolder' : 'Create Folder'}
                </button>
              </div>

              {subfolders.length === 0 ? (
                <div style={s.empty}>
                  {currentFolderId ? `No subfolders inside "${currentFolderName}".` : 'No folders yet.'} Create one above.
                </div>
              ) : (
                <div style={s.table}>
                  <div style={s.thead}>
                    <span style={{ flex:1 }}>Folder Name</span>
                    <span style={{ width:240, textAlign:'right' }}>Actions</span>
                  </div>
                  {subfolders.map(f => (
                    <div key={f.id} style={s.trow}>
                      {renamingFolder?.id === f.id ? (
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                          <input
                            style={{ ...s.input, ...(folderRenameError ? s.inputError : {}) }}
                            value={folderRenameVal}
                            onChange={e => { setFolderRenameVal(e.target.value); if (folderRenameError) setFolderRenameError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(); if (e.key === 'Escape') setRenamingFolder(null); }}
                            autoFocus
                          />
                          {folderRenameError && <p style={s.errorMsg}>⚠ {folderRenameError}</p>}
                        </div>
                      ) : (
                        <button style={s.folderNameBtn} onClick={() => navigateInto(f)}>
                          📁 {f.name}
                          <span style={s.enterHint}>Enter →</span>
                        </button>
                      )}
                      <div style={s.actions}>
                        {renamingFolder?.id === f.id ? (
                          <>
                            <button style={s.saveBtn} onClick={handleRenameFolder} disabled={folderBusy}>Save</button>
                            <button style={s.cancelBtn} onClick={() => { setRenamingFolder(null); setFolderRenameError(''); }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button style={s.editBtn} onClick={() => { setRenamingFolder(f); setFolderRenameVal(f.name); setFolderRenameError(''); }}>Rename</button>
                            <button style={s.deleteBtn} onClick={() => handleDeleteFolder(f.id, f.name)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Documents Tab ─── */}
          {tab === 'documents' && (
            <div>
              <div style={s.createRow}>
                <button style={s.primaryBtn} onClick={openUpload}>⬆ Upload PDF</button>
                <span style={{ color:'#aaa', fontSize:13, alignSelf:'center' }}>
                  Uploading into: 📁 {currentFolderName}
                </span>
              </div>

              {folderDocs.length === 0 ? (
                <div style={s.empty}>No documents in {currentFolderId ? `"${currentFolderName}"` : 'Root'}. Upload one above.</div>
              ) : (
                <div style={s.table}>
                  <div style={s.thead}>
                    <span style={{ flex:1 }}>Document Name</span>
                    <span style={{ width:80 }}>Source</span>
                    <span style={{ width:200, textAlign:'right' }}>Actions</span>
                  </div>
                  {folderDocs.map(p => (
                    <div key={p.id} style={{ ...s.trow, flexWrap:'wrap' }}>
                      {renamingPdf?.id === p.id ? (
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, marginRight:8, minWidth:200 }}>
                          <input
                            style={s.input}
                            value={pdfRenameVal}
                            onChange={e => setPdfRenameVal(e.target.value)}
                            placeholder="Display name"
                            onKeyDown={e => e.key === 'Enter' && handleRenamePdf()}
                            autoFocus
                          />
                          {p.source === 'blob' ? (
                            <select style={s.select} value={pdfMoveFolderId} onChange={e => setPdfMoveFolderId(e.target.value)}>
                              <option value="KEEP">Keep in current folder ({currentFolderName})</option>
                              <option value="__none__">Move to Root</option>
                              {renderFolderOptions()}
                            </select>
                          ) : (
                            <p style={{ fontSize:12, color:'#aaa', margin:0 }}>ℹ Local files cannot be moved via admin</p>
                          )}
                        </div>
                      ) : (
                        <span style={{ flex:1, fontWeight:600, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
                          📄 {p.title || p.name}
                        </span>
                      )}
                      <span style={{ width:80, flexShrink:0 }}>
                        <span style={{ ...s.sourceBadge, ...(p.source === 'blob' ? s.blobBadge : s.fsBadge) }}>
                          {p.source === 'blob' ? 'Cloud' : 'Local'}
                        </span>
                      </span>
                      <div style={{ ...s.actions, width:200, flexShrink:0 }}>
                        {renamingPdf?.id === p.id ? (
                          <>
                            <button style={s.saveBtn} onClick={handleRenamePdf} disabled={pdfBusy}>Save</button>
                            <button style={s.cancelBtn} onClick={() => setRenamingPdf(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button style={s.editBtn} onClick={() => { setRenamingPdf(p); setPdfRenameVal(p.title || p.name || ''); setPdfMoveFolderId('KEEP'); }}>Edit</button>
                            <button style={s.deleteBtn} onClick={() => handleDeletePdf(p.id, p.title || p.name, p.source)}>Delete</button>
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

      {/* ─── Upload Modal ─── */}
      {showUpload && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget && !uploading) setShowUpload(false); }}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Upload PDF</h2>

            <label style={s.label}>PDF File</label>
            <div style={{ ...s.dropZone, ...(uploadFile ? s.dropZoneActive : {}) }} onClick={() => fileRef.current?.click()}>
              {uploadFile
                ? <span style={{ color:'#BF0426', fontWeight:500 }}>📄 {uploadFile.name} ({(uploadFile.size/1024/1024).toFixed(1)} MB)</span>
                : <span style={{ color:'#aaa' }}>Click to select a PDF (max 50 MB)</span>
              }
              <input ref={fileRef} type="file" accept="application/pdf" style={{ display:'none' }}
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) { setUploadFile(f); if (!uploadName) setUploadName(f.name.replace(/\.pdf$/i, '')); }
                }}
              />
            </div>

            <label style={s.label}>Display Name</label>
            <input style={s.input} placeholder="e.g. Q1 2025 Report" value={uploadName} onChange={e => setUploadName(e.target.value)} />

            <label style={s.label}>Folder</label>
            <select style={s.select} value={uploadFolderId} onChange={e => setUploadFolderId(e.target.value)}>
              <option value="">Root (no folder)</option>
              {renderFolderOptions()}
            </select>

            {uploadProgress && <p style={{ color:'#BF0426', fontSize:13, fontWeight:500, margin:'4px 0' }}>⏳ {uploadProgress}</p>}

            <div style={{ display:'flex', gap:12, marginTop:16 }}>
              <button
                style={{ ...s.primaryBtn, flex:1, opacity:(uploading || !uploadFile || !uploadName.trim()) ? 0.5 : 1 }}
                onClick={handleUploadPDF}
                disabled={uploading || !uploadFile || !uploadName.trim()}
              >{uploading ? 'Uploading…' : '⬆ Upload'}</button>
              <button style={{ ...s.cancelBtn, padding:'12px 20px' }} onClick={() => !uploading && setShowUpload(false)} disabled={uploading}>Cancel</button>
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
  adminBadge: { background:'#BF0426', color:'#fff', fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:20, letterSpacing:'0.5px' },
  backBtn: { background:'transparent', border:'1.5px solid #FADADD', color:'#BF0426', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  content: { maxWidth:1100, margin:'0 auto', padding:'36px 24px' },
  h1: { fontSize:'clamp(22px,3vw,32px)', fontWeight:800, color:'#1a1a2e', marginBottom:4 },
  sub: { fontSize:13, color:'#aaa', marginBottom:24 },
  // Breadcrumb
  breadcrumb: { display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginBottom:28, background:'#fff', border:'1.5px solid #f0f0f0', borderRadius:10, padding:'10px 16px' },
  breadBtn: { background:'transparent', border:'none', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Syne',sans-serif", padding:'2px 6px', borderRadius:6, transition:'all 0.15s' },
  breadBtnActive: { color:'#BF0426', fontWeight:800 },
  breadSep: { color:'#ccc', fontSize:16, fontWeight:400, margin:'0 2px' },
  // Tabs
  tabs: { display:'flex', gap:8, marginBottom:24 },
  tabBtn: { padding:'10px 20px', borderRadius:10, border:'1.5px solid #e0e0e0', background:'#fff', color:'#888', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:"'Syne',sans-serif" },
  tabActive: { background:'#BF0426', color:'#fff', border:'1.5px solid #BF0426' },
  // Create row
  createRow: { display:'flex', gap:12, marginBottom:24, flexWrap:'wrap', alignItems:'flex-start' },
  input: { width:'100%', padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:8, fontSize:14, fontFamily:"'Syne',sans-serif", outline:'none', background:'#fff', boxSizing:'border-box' },
  inputError: { border:'1.5px solid #BF0426' },
  select: { width:'100%', padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:8, fontSize:14, fontFamily:"'Syne',sans-serif", outline:'none', background:'#fff', cursor:'pointer', boxSizing:'border-box' },
  errorMsg: { color:'#BF0426', fontSize:12, fontWeight:600, margin:'4px 0 0 2px' },
  primaryBtn: { padding:'12px 20px', background:'#BF0426', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Syne',sans-serif", whiteSpace:'nowrap' },
  editBtn: { padding:'7px 14px', background:'#f0f0f0', color:'#444', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  deleteBtn: { padding:'7px 14px', background:'#FFF0F2', color:'#BF0426', border:'1px solid #FADADD', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  saveBtn: { padding:'7px 14px', background:'#BF0426', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  cancelBtn: { padding:'7px 14px', background:'#f5f5f5', color:'#666', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif" },
  empty: { textAlign:'center', padding:'60px 0', color:'#bbb', fontSize:15 },
  // Table
  table: { background:'#fff', borderRadius:14, border:'1.5px solid #f0f0f0', overflow:'hidden' },
  thead: { display:'flex', alignItems:'center', padding:'12px 20px', background:'#f8f8f8', borderBottom:'1px solid #f0f0f0', fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', gap:12 },
  trow: { display:'flex', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #f8f8f8', gap:12, minHeight:62 },
  actions: { display:'flex', gap:8, justifyContent:'flex-end', flexShrink:0 },
  folderNameBtn: { flex:1, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, background:'transparent', border:'none', cursor:'pointer', fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:'#1a1a2e', textAlign:'left', padding:'6px 0' },
  enterHint: { fontSize:11, color:'#BF0426', fontWeight:700, background:'#FFF0F2', padding:'3px 10px', borderRadius:20, border:'1px solid #FADADD', whiteSpace:'nowrap' },
  sourceBadge: { fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:12 },
  blobBadge: { background:'#e8f5e9', color:'#2e7d32' },
  fsBadge: { background:'#e3f2fd', color:'#1565c0' },
  // Modal
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 },
  modal: { background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:480, boxShadow:'0 24px 64px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', gap:10 },
  modalTitle: { fontSize:20, fontWeight:800, color:'#1a1a2e', marginBottom:6 },
  label: { fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px' },
  dropZone: { border:'2px dashed #e0e0e0', borderRadius:10, padding:'24px 16px', textAlign:'center', cursor:'pointer', background:'#fafafa' },
  dropZoneActive: { borderColor:'#BF0426', background:'#FFF0F2' },
};
