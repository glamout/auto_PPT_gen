
import React, { useState } from 'react';
import { AppStep, PresentationPlan, UploadedFile, SlideData, Language, Provider, LogEntry } from './types';
import { FileUpload } from './components/FileUpload';
import { SlideEditor } from './components/SlideEditor';
import { PreviewDownload } from './components/PreviewDownload';
import { Spinner } from './components/Spinner';
import { processFiles } from './services/fileService';
import { generateSlidePlan } from './services/geminiService';
import { translations } from './translations';
import { FileText } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [slideCount, setSlideCount] = useState<number>(5);
  // const [styleInput, setStyleInput] = useState<string>('哆啦 A 梦');
  const [styleInput, setStyleInput] = useState<string>('');
  //const [requirementsInput, setRequirementsInput] = useState<string>('企业 AI 落地难题');
  const [requirementsInput, setRequirementsInput] = useState<string>('');
  const [uiLanguage, setUiLanguage] = useState<Language>('zh'); 
  const [outputLanguage, setOutputLanguage] = useState<Language>('zh');
  
  // Provider Config
  const [provider, setProvider] = useState<Provider>('zenmux');

  const [apiKey, setApiKey] = useState<string>('');

  // Data State
  const [extractedContext, setExtractedContext] = useState<string>('');
  const [availableImages, setAvailableImages] = useState<UploadedFile[]>([]);
  const [plan, setPlan] = useState<PresentationPlan | null>(null);

  // Logging
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const t = translations[uiLanguage];

  const addLog = (entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
  };

  const downloadLogs = () => {
    const logContent = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message || ''}\nURL: ${l.url || 'N/A'}\nMethod: ${l.method || 'N/A'}\nHeaders: ${JSON.stringify(l.headers)}\nBody: ${JSON.stringify(l.body)}\nResponse: ${JSON.stringify(l.response)}\n----------------------------------------\n`).join('');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug_logs_${new Date().toISOString()}.txt`;
    a.click();
  };

  const handleStartProcessing = async () => {
    setStep(AppStep.PROCESSING);
    try {
      // 1. Process Files
      const { context, images } = await processFiles(files);
      setExtractedContext(context);
      setAvailableImages(images);

      // 2. Call Gemini (Passing style and requirements)
      const generatedPlan = await generateSlidePlan(
        context, 
        slideCount, 
        urls, 
        outputLanguage,
        styleInput,
        requirementsInput,
        provider,
        apiKey,
        addLog
      );
      setPlan(generatedPlan);
      
      setStep(AppStep.EDITOR);
    } catch (error) {
      console.error(error);
      alert(t.errorProcessing);
      setStep(AppStep.UPLOAD);
    }
  };

  const handleUpdatePlan = (updatedPlan: PresentationPlan) => {
    setPlan(updatedPlan);
  };

  const handleAddImages = async (newFiles: File[]): Promise<UploadedFile[]> => {
    try {
      // Only process images
      const { images } = await processFiles(newFiles);
      setAvailableImages(prev => [...prev, ...images]);
      return images;
    } catch (error) {
      console.error("Error adding images", error);
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      {/* Log Download Button */}
      <button 
        onClick={downloadLogs}
        className="fixed bottom-4 right-4 z-50 bg-slate-50 text-slate-50 p-2 rounded-full transition-all"
        title="Download Logs"
      >
        <FileText className="w-5 h-5" />
      </button>

      {step === AppStep.UPLOAD && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <FileUpload 
            files={files}
            urls={urls}
            slideCount={slideCount}
            styleInput={styleInput}
            requirementsInput={requirementsInput}
            uiLanguage={uiLanguage}
            outputLanguage={outputLanguage}
            provider={provider}
            apiKey={apiKey}
            onFilesChange={(newFiles) => setFiles(newFiles)}
            onUrlsChange={(newUrls) => setUrls(newUrls)}
            onSlideCountChange={setSlideCount}
            onStyleInputChange={setStyleInput}
            onRequirementsInputChange={setRequirementsInput}
            onUiLanguageChange={setUiLanguage}
            onOutputLanguageChange={setOutputLanguage}
            onProviderChange={setProvider}
            onApiKeyChange={setApiKey}
            onStart={handleStartProcessing}
          />
        </div>
      )}

      {step === AppStep.PROCESSING && (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Spinner message={t.processing} />
        </div>
      )}

      {step === AppStep.EDITOR && plan && (
        <SlideEditor 
          plan={plan}
          availableImages={availableImages}
          uiLanguage={uiLanguage}
          onUpdatePlan={handleUpdatePlan}
          onAddImages={handleAddImages}
          onConfirm={() => setStep(AppStep.PREVIEW)}
        />
      )}

      {step === AppStep.PREVIEW && plan && (
        <PreviewDownload 
          plan={plan}
          images={availableImages}
          uiLanguage={uiLanguage}
          provider={provider}
          apiKey={apiKey}
          addLog={addLog}
          onRestart={() => {
            setFiles([]);
            setUrls([]);
            setPlan(null);
            setStep(AppStep.UPLOAD);
          }}
        />
      )}
    </div>
  );
};

export default App;
