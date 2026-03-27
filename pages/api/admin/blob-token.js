import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { getSession } from '../../../lib/session';

// Returns a short-lived client token the browser uses to PUT directly to Vercel Blob.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  if (session.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });

  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      access: 'public',
      pathname: filename,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: 100 * 1024 * 1024,
      addRandomSuffix: true,
    });
    return res.json({ clientToken });
  } catch (err) {
    console.error('[blob-token]', err);
    return res.status(500).json({ error: err.message });
  }
}
