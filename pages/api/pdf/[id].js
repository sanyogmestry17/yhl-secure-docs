import { getIronSession } from 'iron-session';
import { getPDF } from '../../../lib/pdfs';
import { sessionOptions } from '../../../lib/session';
import path from 'path';
import fs from 'fs';

export default async function handler(req, res) {
  try {
    const session = await getIronSession(req, res, sessionOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    const pdf = await getPDF(id);
    if (!pdf) return res.status(404).json({ error: 'Document not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (pdf.source === 'blob') {
      const blobRes = await fetch(pdf.blobUrl);
      if (!blobRes.ok) return res.status(502).json({ error: 'Failed to fetch document' });
      const buffer = Buffer.from(await blobRes.arrayBuffer());
      return res.send(buffer);
    }

    // Filesystem
    const filePath = path.join(process.cwd(), 'private', 'pdfs', pdf.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
    return res.send(fs.readFileSync(filePath));
  } catch (err) {
    console.error('[pdf api] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
