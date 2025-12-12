
import React, { useState } from 'react';
import { AppStep, PresentationPlan, UploadedFile, SlideData, Language } from './types';
import { FileUpload } from './components/FileUpload';
import { SlideEditor } from './components/SlideEditor';
import { PreviewDownload } from './components/PreviewDownload';
import { Spinner } from './components/Spinner';
import { processFiles } from './services/fileService';
import { generateSlidePlan } from './services/geminiService';
import { translations } from './translations';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [slideCount, setSlideCount] = useState<number>(5);
  const [styleInput, setStyleInput] = useState<string>('');
  const [requirementsInput, setRequirementsInput] = useState<string>('');
  const [uiLanguage, setUiLanguage] = useState<Language>('zh'); 
  const [outputLanguage, setOutputLanguage] = useState<Language>('zh');

  // Data State
  const [extractedContext, setExtractedContext] = useState<string>('');
  const [availableImages, setAvailableImages] = useState<UploadedFile[]>([]);
  const [plan, setPlan] = useState<PresentationPlan | null>(null);

  const t = translations[uiLanguage];

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
        requirementsInput
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
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
            onFilesChange={(newFiles) => setFiles(newFiles)}
            onUrlsChange={(newUrls) => setUrls(newUrls)}
            onSlideCountChange={setSlideCount}
            onStyleInputChange={setStyleInput}
            onRequirementsInputChange={setRequirementsInput}
            onUiLanguageChange={setUiLanguage}
            onOutputLanguageChange={setOutputLanguage}
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
