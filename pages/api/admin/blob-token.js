import { handleUpload } from '@vercel/blob/client';
import { getSession } from '../../../lib/session';
import { createPDFMeta } from '../../../lib/pdfMeta';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Auth only here — this runs for browser token requests (has session cookie).
        // onUploadCompleted is called by Vercel Blob servers (no cookie) so must not be gated.
        const session = await getSession(req, res);
        if (!session?.user) throw new Error('Unauthorized');
        if (session.user.email !== process.env.ADMIN_EMAIL) throw new Error('Forbidden');
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
