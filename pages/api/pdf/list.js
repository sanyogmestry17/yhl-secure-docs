import { getSession } from '../../../lib/session';
import { getAllPDFs } from '../../../lib/pdfs';
import { getAllFolders } from '../../../lib/pdfMeta';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: 'Unauthorized' });
  const [pdfs, folders] = await Promise.all([getAllPDFs(), getAllFolders()]);
  return res.status(200).json({ pdfs, folders });
}
