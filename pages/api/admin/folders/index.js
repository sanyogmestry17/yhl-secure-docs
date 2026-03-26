import { getSession } from '../../../../lib/session';
import { getAllFolders, createFolder } from '../../../../lib/pdfMeta';

async function requireAdmin(req, res) {
  const session = await getSession(req, res);
  if (!session?.user) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (session.user.email !== process.env.ADMIN_EMAIL) { res.status(403).json({ error: 'Forbidden' }); return null; }
  return session;
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const folders = await getAllFolders();
    return res.status(200).json({ folders });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const folder = await createFolder(name.trim());
    return res.status(201).json({ folder });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
