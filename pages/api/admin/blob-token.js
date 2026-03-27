import { handleUpload } from '@vercel/blob/client';
import { getSession } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => {
        const session = await getSession(req, res);
        if (!session?.user) throw new Error('Unauthorized');
        if (session.user.email !== process.env.ADMIN_EMAIL) throw new Error('Forbidden');
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      // No onUploadCompleted — metadata is saved client-side after upload() resolves
    });
    return res.json(jsonResponse);
  } catch (err) {
    console.error('[blob-token]', err);
    return res.status(500).json({ error: err.message });
  }
}
