import * as mammoth from 'mammoth';
import { UploadedFile } from '../types';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const extractPdfText = async (dataUrl: string): Promise<string> => {
  try {
    const loadingTask = window.pdfjsLib.getDocument(dataUrl);
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `[Page ${i}] ${pageText}\n`;
    }
    return fullText;
  } catch (error) {
    console.error("Error parsing PDF", error);
    return "Error parsing PDF content.";
  }
};

const extractDocxText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error parsing DOCX", error);
    return "Error parsing DOCX content.";
  }
};

export const processFiles = async (files: File[]): Promise<{ context: string, images: UploadedFile[] }> => {
  let combinedText = '';
  const imageFiles: UploadedFile[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const id = Math.random().toString(36).substring(7);

    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      const dataUrl = await readFileAsBase64(file);
      imageFiles.push({
        id,
        name: file.name,
        type: 'image',
        dataUrl,
        file
      });
      // We don't extract text from images in this simplified version, 
      // but we treat them as assets for the slides.
    } else if (ext === 'pdf') {
      const dataUrl = await readFileAsBase64(file);
      const text = await extractPdfText(dataUrl);
      combinedText += `\n--- DOCUMENT: ${file.name} ---\n${text}`;
    } else if (ext === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractDocxText(arrayBuffer);
      combinedText += `\n--- DOCUMENT: ${file.name} ---\n${text}`;
    } else if (['txt', 'md', 'html'].includes(ext || '')) {
      const text = await readFileAsText(file);
      combinedText += `\n--- DOCUMENT: ${file.name} ---\n${text}`;
    }
  }

  return { context: combinedText, images: imageFiles };
};