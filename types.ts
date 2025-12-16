

export enum AppStep {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  EDITOR = 'EDITOR',
  GENERATING_VISUALS = 'GENERATING_VISUALS',
  PREVIEW = 'PREVIEW'
}

export type Language = 'en' | 'zh';

export type Provider = 'google' | 'zenmux';

export interface LogEntry {
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'info';
  url?: string;
  method?: string;
  headers?: any;
  body?: any;
  response?: any;
  message?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'image' | 'html' | 'md';
  content?: string; // Text content
  dataUrl?: string; // For images
  file: File;
}

export interface SlideData {
  id: string;
  title: string;
  bullets: string[];
  visualNote: string; // AI suggestion for the image
  selectedImageIds?: string[]; // IDs of the UploadedFiles (images) assigned to this slide
}

export interface PresentationPlan {
  topic: string;
  style?: string; // Visual style description
  requirements?: string; // Analysis/Content requirements
  slides: SlideData[];
}

export interface ParseResult {
  textContext: string;
  images: UploadedFile[];
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    pdfjsLib: any;
    aistudio?: AIStudio;
  }
}
