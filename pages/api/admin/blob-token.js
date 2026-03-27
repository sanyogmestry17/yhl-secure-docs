import { handleUpload } from '@vercel/blob/client';
import { getSession } from '../../../lib/session';

// bodyParser must be false so we can read the raw body for signature verification
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Read raw body from stream (bodyParser is disabled)
  const rawBody = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Auth check happens here — Vercel Blob calls this during token generation
        const session = await getSession(req, res);
        if (!session?.user) throw new Error('Unauthorized');
        if (session.user.email !== process.env.ADMIN_EMAIL) throw new Error('Forbidden');
        return {
          access: 'private',
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB
        };
      },
      // No onUploadCompleted — metadata is saved client-side after upload() resolves
    });
    return res.json(jsonResponse);
  } catch (err) {
    console.error('[blob-token]', err);
    return res.status(400).json({ error: err.message });
  }
}
