import { getIronSession } from 'iron-session';
import { getPDF } from '../../../lib/pdfs';
import { sessionOptions } from '../../../lib/session';
import path from 'path';
import fs from 'fs';

export default async function handler(req, res) {
  try {
    const session = await getIronSession(req, res, sessionOptions);
    
    if (!session || !session.user) {
      console.log('[pdf api] No session found. Cookies:', req.headers.cookie);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const pdf = getPDF(id);
    if (!pdf) {
      console.log('[pdf api] PDF not found for ID:', id);
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.join(process.cwd(), 'private', 'pdfs', pdf.filename);
    if (!fs.existsSync(filePath)) {
      console.log('[pdf api] File not found at:', filePath);
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    console.log('[pdf api] Serving PDF, size:', fileBuffer.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.send(fileBuffer);
  } catch (err) {
    console.error('[pdf api] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}