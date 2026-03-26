import { put } from '@vercel/blob';
import { getSession } from '../../../../lib/session';
import { createPDFMeta } from '../../../../lib/pdfMeta';
import { v4 as uuid } from 'uuid';

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

async function requireAdmin(req, res) {
  const session = await getSession(req, res);
  if (!session?.user) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (session.user.email !== process.env.ADMIN_EMAIL) { res.status(403).json({ error: 'Forbidden' }); return null; }
  return session;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await requireAdmin(req, res);
  if (!session) return;

  const { name, folderId, fileBase64, fileName } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Display name is required' });
  if (!fileBase64 || !fileName) return res.status(400).json({ error: 'File is required' });

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const id = uuid();
    const blobName = `pdfs/${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const blob = await put(blobName, buffer, { access: 'public', contentType: 'application/pdf' });
    const record = await createPDFMeta({
      id,
      name: name.trim(),
      filename: blobName,
      blobUrl: blob.url,
      folderId: folderId || null,
    });
    return res.status(201).json({ pdf: record });
  } catch (err) {
    console.error('[admin upload]', err);
    return res.status(500).json({ error: err.message });
  }
}
