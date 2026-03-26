import { getSession } from '../../../../lib/session';
import { getAllFolders, renameFolder, deleteFolder, getAllBlobPDFs, updatePDFMeta } from '../../../../lib/pdfMeta';

async function requireAdmin(req, res) {
  const session = await getSession(req, res);
  if (!session?.user) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (session.user.email !== process.env.ADMIN_EMAIL) { res.status(403).json({ error: 'Forbidden' }); return null; }
  return session;
}

// Collect all descendant folder IDs recursively
function collectDescendants(id, allFolders) {
  const children = allFolders.filter(f => f.parentId === id);
  const ids = children.map(f => f.id);
  for (const child of children) {
    ids.push(...collectDescendants(child.id, allFolders));
  }
  return ids;
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
    const allFolders = await getAllFolders();
    const descendantIds = collectDescendants(id, allFolders);
    const toDelete = [id, ...descendantIds];

    // Move all docs in any of these folders to uncategorised
    const pdfs = await getAllBlobPDFs();
    await Promise.all(
      pdfs.filter(p => toDelete.includes(p.folderId)).map(p => updatePDFMeta(p.id, { folderId: null }))
    );

    // Delete all folders (target + descendants)
    for (const fid of toDelete) {
      await deleteFolder(fid);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
