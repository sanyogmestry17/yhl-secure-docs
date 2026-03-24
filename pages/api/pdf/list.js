import { getSession } from '../../../lib/session';
import { getAllPDFs } from '../../../lib/pdfs';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: 'Unauthorized' });
  return res.status(200).json({ pdfs: getAllPDFs() });
}