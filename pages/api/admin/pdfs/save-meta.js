import { getSession } from '../../../../lib/session';
import { createPDFMeta } from '../../../../lib/pdfMeta';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  if (session.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });

  const { name, folderId, blobUrl, pathname } = req.body;
  if (!blobUrl || !pathname) return res.status(400).json({ error: 'blobUrl and pathname are required' });

  const record = await createPDFMeta({
    id: uuid(),
    name: name || pathname,
    filename: pathname,
    blobUrl,
    folderId: folderId || null,
  });

  return res.status(201).json({ pdf: record });
}
