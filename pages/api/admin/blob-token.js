import { handleUpload } from '@vercel/blob/client';
import { getSession } from '../../../lib/session';
import { createPDFMeta } from '../../../lib/pdfMeta';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  if (session.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
          addRandomSuffix: true,
          tokenPayload: clientPayload, // { name, folderId } round-tripped back on completion
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { name, folderId } = JSON.parse(tokenPayload || '{}');
        await createPDFMeta({
          id: uuid(),
          name: name || blob.pathname,
          filename: blob.pathname,
          blobUrl: blob.url,
          folderId: folderId || null,
        });
      },
    });
    return res.json(jsonResponse);
  } catch (err) {
    console.error('[blob-token]', err);
    return res.status(500).json({ error: err.message });
  }
}
