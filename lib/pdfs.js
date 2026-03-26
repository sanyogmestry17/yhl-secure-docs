import fs from 'fs';
import path from 'path';
import { getAllBlobPDFs, getPDFMeta } from './pdfMeta';

function readFilesystemPDFs() {
  const pdfDir = path.join(process.cwd(), 'private', 'pdfs');
  if (!fs.existsSync(pdfDir)) return [];
  try {
    return fs.readdirSync(pdfDir)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(filename => ({
        id: path.basename(filename, '.pdf').toLowerCase(),
        title: filename.replace('.pdf', ''),
        filename,
        folderId: null,
        source: 'filesystem',
      }));
  } catch { return []; }
}

export async function getAllPDFs() {
  const fsPdfs = readFilesystemPDFs();
  const blobPdfs = await getAllBlobPDFs();
  // Blob PDFs use 'name' as display title for consistency
  const normalizedBlob = blobPdfs.map(p => ({ ...p, title: p.name }));
  return [...fsPdfs, ...normalizedBlob];
}

export async function getPDF(id) {
  const fsMatch = readFilesystemPDFs().find(p => p.id === id.toLowerCase());
  if (fsMatch) return fsMatch;
  return getPDFMeta(id);
}
