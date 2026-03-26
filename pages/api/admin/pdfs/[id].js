import { del } from '@vercel/blob';
import { getSession } from '../../../../lib/session';
import { getPDFMeta, updatePDFMeta, deletePDFMeta } from '../../../../lib/pdfMeta';

async function requireAdmin(req, res) {
  const session = await getSession(req, res);
  if (!session?.user) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (session.user.email !== process.env.ADMIN_EMAIL) { res.status(403).json({ error: 'Forbidden' }); return null; }
  return session;
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const { id } = req.query;

  if (req.method === 'PATCH') {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.folderId !== undefined) updates.folderId = req.body.folderId || null;
    const pdf = await updatePDFMeta(id, updates);
    if (!pdf) return res.status(404).json({ error: 'PDF not found' });
    return res.status(200).json({ pdf });
  }

  if (req.method === 'DELETE') {
    const pdf = await getPDFMeta(id);
    if (!pdf) return res.status(404).json({ error: 'PDF not found' });
    // Remove from Vercel Blob
    try { await del(pdf.blobUrl); } catch (e) { console.warn('[admin delete blob]', e.message); }
    await deletePDFMeta(id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
