
import React, { useState, useRef } from 'react';
import { Upload, FileText, Link as LinkIcon, X, Languages, HelpCircle } from 'lucide-react';
import { Language, Provider } from '../types';
import { translations } from '../translations';

interface FileUploadProps {
  files: File[];
  urls: string[];
  slideCount: number;
  styleInput: string;
  requirementsInput: string;
  uiLanguage: Language;
  outputLanguage: Language;
  provider: Provider;
  apiKey: string;
  onFilesChange: (files: File[]) => void;
  onUrlsChange: (urls: string[]) => void;
  onSlideCountChange: (count: number) => void;
  onStyleInputChange: (val: string) => void;
  onRequirementsInputChange: (val: string) => void;
  onUiLanguageChange: (lang: Language) => void;
  onOutputLanguageChange: (lang: Language) => void;
  onProviderChange: (provider: Provider) => void;
  onApiKeyChange: (key: string) => void;
  onStart: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  files,
  urls,
  slideCount,
  styleInput,
  requirementsInput,
  uiLanguage,
  outputLanguage,
  provider,
  apiKey,
  onFilesChange,
  onUrlsChange,
  onSlideCountChange,
  onStyleInputChange,
  onRequirementsInputChange,
  onUiLanguageChange,
  onOutputLanguageChange,
  onProviderChange,
  onApiKeyChange,
  onStart
}) => {
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[uiLanguage];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).filter((f: File) => 
        ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'text/html', 'image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.name.endsWith('.md')
      );
      if (files.length + newFiles.length > 5) {
        alert(t.maxFiles);
        return;
      }
      onFilesChange([...files, ...newFiles]);
    }
  };

  const addUrl = () => {
    if (urlInput && !urls.includes(urlInput)) {
      onUrlsChange([...urls, urlInput]);
      setUrlInput('');
    }
  };

  const removeFile = (idx: number) => {
    const newFiles = [...files];
    newFiles.splice(idx, 1);
    onFilesChange(newFiles);
  };

  const removeUrl = (idx: number) => {
    const newUrls = [...urls];
    newUrls.splice(idx, 1);
    onUrlsChange(newUrls);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl p-8 border border-slate-100 relative">
      <div className="absolute top-8 right-8 flex items-center space-x-2">
        <button 
          onClick={() => onUiLanguageChange(uiLanguage === 'en' ? 'zh' : 'en')}
          className="text-slate-400 hover:text-indigo-600 flex items-center text-sm font-medium transition-colors"
        >
          <Languages className="w-4 h-4 mr-1" />
          {uiLanguage === 'en' ? '中文' : 'English'}
        </button>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">{t.title}</h2>
      <p className="text-slate-500 text-center mb-8">{t.subtitle}</p>

      {/* Drop Zone */}
      <div 
        className="border-2 border-dashed border-indigo-200 rounded-xl p-8 bg-indigo-50/50 hover:bg-indigo-50 transition-colors text-center cursor-pointer mb-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <p className="text-indigo-900 font-medium">{t.dragDrop}</p>
        <p className="text-sm text-indigo-400 mt-1">{t.fileTypes}</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          multiple 
          className="hidden" 
          accept=".pdf,.docx,.txt,.md,.html,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            if (e.target.files) {
              const newFiles = Array.from(e.target.files);
              onFilesChange([...files, ...newFiles]);
            }
          }}
        />
      </div>

      {/* File List */}
      {(files.length > 0 || urls.length > 0) && (
        <div className="mb-6 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium truncate max-w-[200px]">{f.name}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {urls.map((u, i) => (
            <div key={`u-${i}`} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-3">
                <LinkIcon className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium truncate max-w-[200px]">{u}</span>
              </div>
              <button onClick={() => removeUrl(i)} className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* URL Input */}
      <div className="flex space-x-2 mb-6">
        <input 
          type="text" 
          placeholder={t.uploadPlaceholder} 
          className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addUrl()}
        />
        <button 
          onClick={addUrl}
          className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 font-medium"
        >
          {t.add}
        </button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 gap-4 pt-6 border-t border-slate-100">
        
        {/* Provider Selection */}
        <div className="flex flex-col space-y-2">
          <label className="text-slate-600 font-medium text-sm">AI Provider</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="radio" 
                checked={provider === 'zenmux'} 
                onChange={() => onProviderChange('zenmux')}
                className="form-radio text-indigo-600 accent-indigo-600"
              />
              <span className="text-slate-800">Zenmux (Recommended)</span>
            </label>
            {/* <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="radio" 
                checked={provider === 'google'} 
                onChange={() => onProviderChange('google')}
                className="form-radio text-indigo-600 accent-indigo-600"
              />
              <span className="text-slate-800">Google AI Studio</span>
            </label> */}
          </div>
          {provider === 'zenmux' && (
            <div className="text-sm text-indigo-600 bg-indigo-50 p-2 rounded-lg mt-2">
              {t.zenmuxInvite} 
              <a href="https://zenmux.ai/invite/367KJZ" target="_blank" rel="noreferrer" className="underline font-bold ml-1 hover:text-indigo-800">
                https://zenmux.ai/invite/367KJZ
              </a>
            </div>
          )}
        </div>

        {/* API Key Input */}
        <div className="flex flex-col space-y-2">
          <label className="text-slate-600 font-medium text-sm">
            API Key ({provider === 'zenmux' ? 'Zenmux' : 'Google'})
          </label>
          <input 
            type="password"
            placeholder={provider === 'zenmux' ? 'sk-...' : 'AI...'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Style Input */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <label className="text-slate-600 font-medium text-sm">{t.styleLabel}</label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {t.styleTooltip}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <input 
            type="text"
            placeholder={t.stylePlaceholder}
            value={styleInput}
            onChange={(e) => onStyleInputChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Requirements Input */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <label className="text-slate-600 font-medium text-sm">{t.reqLabel}</label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {t.reqTooltip}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <textarea 
            placeholder={t.reqPlaceholder}
            value={requirementsInput}
            onChange={(e) => onRequirementsInputChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Slide Count */}
          <div className="flex items-center space-x-2">
            <label className="text-slate-600 font-medium text-sm whitespace-nowrap">{t.slideCount} (1-99)</label>
            <input 
              type="number" 
              min="1" 
              max="99" 
              value={slideCount}
              onChange={(e) => onSlideCountChange(Math.max(1, Math.min(99, parseInt(e.target.value) || 5)))}
              className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-center outline-none focus:border-indigo-500 text-slate-900"
            />
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <label className="text-slate-600 font-medium text-sm whitespace-nowrap">{t.outputLang}</label>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => onOutputLanguageChange('en')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${outputLanguage === 'en' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                English
              </button>
              <button 
                onClick={() => onOutputLanguageChange('zh')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${outputLanguage === 'zh' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                中文
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <button 
          onClick={onStart}
          disabled={(files.length === 0 && urls.length === 0) || !apiKey}
          className="w-full bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all"
        >
          {t.generatePlan}
        </button>
      </div>
    </div>
  );
};
