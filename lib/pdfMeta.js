import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ─── Folders ────────────────────────────────────────────────────────────────

export async function getAllFolders() {
  try {
    const data = await redis.get('yhl:folders');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function createFolder(name) {
  const id = `f_${Date.now()}`;
  const folder = { id, name, createdAt: new Date().toISOString() };
  const folders = await getAllFolders();
  folders.push(folder);
  await redis.set('yhl:folders', folders);
  return folder;
}

export async function renameFolder(id, name) {
  const folders = await getAllFolders();
  const idx = folders.findIndex(f => f.id === id);
  if (idx === -1) return null;
  folders[idx].name = name;
  await redis.set('yhl:folders', folders);
  return folders[idx];
}

export async function deleteFolder(id) {
  const folders = await getAllFolders();
  const updated = folders.filter(f => f.id !== id);
  await redis.set('yhl:folders', updated);
}

// ─── PDFs (blob-uploaded) ────────────────────────────────────────────────────

export async function getAllBlobPDFs() {
  try {
    const data = await redis.get('yhl:pdfs');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function getPDFMeta(id) {
  const pdfs = await getAllBlobPDFs();
  return pdfs.find(p => p.id === id) || null;
}

export async function createPDFMeta({ id, name, filename, blobUrl, folderId }) {
  const record = {
    id,
    name,
    filename,
    blobUrl,
    folderId: folderId || null,
    source: 'blob',
    createdAt: new Date().toISOString(),
  };
  const pdfs = await getAllBlobPDFs();
  pdfs.push(record);
  await redis.set('yhl:pdfs', pdfs);
  return record;
}

export async function updatePDFMeta(id, updates) {
  const pdfs = await getAllBlobPDFs();
  const idx = pdfs.findIndex(p => p.id === id);
  if (idx === -1) return null;
  pdfs[idx] = { ...pdfs[idx], ...updates };
  await redis.set('yhl:pdfs', pdfs);
  return pdfs[idx];
}

export async function deletePDFMeta(id) {
  const pdfs = await getAllBlobPDFs();
  await redis.set('yhl:pdfs', pdfs.filter(p => p.id !== id));
}
