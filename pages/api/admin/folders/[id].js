import { getSession } from '../../../../lib/session';
import { renameFolder, deleteFolder, getAllBlobPDFs, updatePDFMeta } from '../../../../lib/pdfMeta';

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
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const folder = await renameFolder(id, name.trim());
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    return res.status(200).json({ folder });
  }

  if (req.method === 'DELETE') {
    // Move PDFs in this folder to uncategorized
    const pdfs = await getAllBlobPDFs();
    await Promise.all(
      pdfs.filter(p => p.folderId === id).map(p => updatePDFMeta(p.id, { folderId: null }))
    );
    await deleteFolder(id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
