import fs from 'fs';
import path from 'path';

// Dynamically scan the pdfs folder
export const getAllPDFs = () => {
  const pdfDir = path.join(process.cwd(), 'private', 'pdfs');
  
  if (!fs.existsSync(pdfDir)) {
    console.log('[pdfs] PDF directory does not exist:', pdfDir);
    return [];
  }

  try {
    const files = fs.readdirSync(pdfDir);
    const pdfs = files
      .filter((file) => file.toLowerCase().endsWith('.pdf'))
      .map((filename) => {
        const fileId = path.basename(filename, '.pdf').toLowerCase();
        return {
          id: fileId,
          title: filename.replace('.pdf', ''),
          filename: filename,
          description: '',
        };
      });
    
    return pdfs;
  } catch (err) {
    console.error('[pdfs] Error reading PDF directory:', err);
    return [];
  }
};

export const getPDF = (id) => {
  const pdfs = getAllPDFs();
  return pdfs.find((pdf) => pdf.id === id.toLowerCase()) || null;
};