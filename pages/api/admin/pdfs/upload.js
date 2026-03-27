import { put } from '@vercel/blob';
import { getSession } from '../../../../lib/session';
import { createPDFMeta } from '../../../../lib/pdfMeta';
import { v4 as uuid } from 'uuid';

// Disable Next.js body parser — we stream the raw binary body straight to Vercel Blob
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  if (session.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });

  const rawName = req.headers['x-display-name'];
  const rawFile = req.headers['x-file-name'];
  const rawFolder = req.headers['x-folder-id'];

  const displayName = rawName ? decodeURIComponent(rawName) : 'Untitled';
  const fileName = rawFile ? decodeURIComponent(rawFile) : 'document.pdf';
  const folderId = rawFolder && rawFolder !== 'null' && rawFolder !== '' ? rawFolder : null;

  try {
    const id = uuid();
    const blobPath = `pdfs/${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    // Stream req directly to Vercel Blob — no buffering, no base64, no size inflation
    const blob = await put(blobPath, req, { access: 'public', contentType: 'application/pdf' });
    const record = await createPDFMeta({ id, name: displayName, filename: blob.pathname, blobUrl: blob.url, folderId });
    return res.status(201).json({ pdf: record });
  } catch (err) {
    console.error('[upload]', err);
    return res.status(500).json({ error: err.message });
  }
}
