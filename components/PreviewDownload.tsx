
import React, { useEffect, useState } from 'react';
import { SlideData, UploadedFile, Language, PresentationPlan, Provider, LogEntry } from '../types';
import { generateFinalSlideImage } from '../services/geminiService';
import JSZip from 'jszip';
import { Download, RefreshCw, ZoomIn, X, AlertCircle } from 'lucide-react';
import { Spinner } from './Spinner';
import { translations } from '../translations';

interface PreviewDownloadProps {
  plan: PresentationPlan;
  images: UploadedFile[];
  uiLanguage: Language;
  provider: Provider;
  apiKey: string;
  addLog: (entry: LogEntry) => void;
  onRestart: () => void;
}

export const PreviewDownload: React.FC<PreviewDownloadProps> = ({ plan, images, uiLanguage, provider, apiKey, addLog, onRestart }) => {
  const [generatedImages, setGeneratedImages] = useState<(string | null)[]>(new Array(plan.slides.length).fill(null));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const t = translations[uiLanguage];

  // Check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (apiKey) {
        setHasApiKey(true);
        return;
      }

      // Fallback for Google AI Studio environment if no manual key provided
      if (provider === 'google' && window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else if (provider === 'google') {
         // Local dev with env var potentially
         setHasApiKey(true);
      }
    };
    checkKey();
  }, [apiKey, provider]);

  const handleSelectKey = async () => {
    try {
      if (provider === 'google' && window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } else {
        // If Zenmux or no AI Studio, user should have entered key in previous step
        alert("Please enter API Key in the upload step.");
        onRestart();
      }
    } catch (e) {
      console.error("Failed to select key", e);
    }
  };

  const startGeneration = async () => {
    if (!hasApiKey) return;
    
    setIsGenerating(true);
    setProgressIndex(0);
    
    // Process slides sequentially
    const results = [...generatedImages];
    let permissionErrorOccurred = false;

    for (let i = 0; i < plan.slides.length; i++) {
      if (permissionErrorOccurred) break;
      if (results[i]) continue;

      setProgressIndex(i + 1);
      const slide = plan.slides[i];
      
      // Collect all selected images for this slide
      const slideImagesBase64: string[] = [];
      if (slide.selectedImageIds && slide.selectedImageIds.length > 0) {
        slide.selectedImageIds.forEach(id => {
          const imgFile = images.find(img => img.id === id);
          if (imgFile && imgFile.dataUrl) {
            slideImagesBase64.push(imgFile.dataUrl);
          }
        });
      }

      try {
        // Pass the style from the plan and the array of images to the generator
        const imageUrl = await generateFinalSlideImage(
            slide, 
            plan.style || '', 
            slideImagesBase64,
            provider,
            apiKey,
            addLog
        );
        results[i] = imageUrl;
        setGeneratedImages([...results]); 
      } catch (error: any) {
        console.error(`Error generating slide ${i + 1}`, error);
        addLog({
            timestamp: new Date().toISOString(),
            type: 'error',
            message: `Error generating slide ${i + 1}: ${error.message}`
        });
        
        const errorMsg = error?.message || error?.toString() || "";
        
        // Catch 403/Permission errors specifically
        if (
          errorMsg.includes("permission") || 
          errorMsg.includes("403") || 
          errorMsg.includes("The caller does not have permission") ||
          errorMsg.includes("quota")
        ) {
           permissionErrorOccurred = true;
           setIsGenerating(false);
           setHasApiKey(false); // Reset state to force re-selection
           alert(uiLanguage === 'zh' 
             ? "API 权限不足或配额已满。" 
             : "Permission denied or quota exceeded.");
           return;
        }
        
        // For other errors, we just leave this slide empty and continue
      }
    }

    setIsGenerating(false);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    let hasContent = false;
    
    generatedImages.forEach((img, idx) => {
      if (img) {
        const base64Data = img.replace(/^data:image\/png;base64,/, ""); 
        zip.file(`slide_${idx + 1}.png`, base64Data, { base64: true });
        hasContent = true;
      }
    });
    
    if (!hasContent) return;

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `${plan.topic.replace(/\s+/g, '_')}_presentation.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <header className="bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex justify-between items-center sticky top-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t.yourPresentation}</h2>
          {plan.style && <p className="text-xs text-slate-400 mt-1">Style: {plan.style}</p>}
        </div>
        <div className="flex space-x-3">
          <button onClick={onRestart} className="text-slate-500 hover:text-slate-800 px-4 py-2 font-medium">
            {t.newProject}
          </button>
          <button 
            onClick={downloadZip}
            disabled={isGenerating || !generatedImages.some(img => img !== null)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-400 flex items-center shadow-md transition-colors"
          >
             <Download className="w-4 h-4 mr-2" />
            {t.downloadZip}
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        {!hasApiKey ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 max-w-lg text-center shadow-sm">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {uiLanguage === 'zh' ? '需要 API 密钥' : 'API Key Required'}
              </h3>
              <p className="text-slate-600 mb-6">
                {uiLanguage === 'zh' 
                  ? '请提供有效的 API 密钥以继续生成。' 
                  : 'Please provide a valid API Key to continue generation.'}
              </p>
              <button 
                onClick={handleSelectKey}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg"
              >
                {uiLanguage === 'zh' ? '配置密钥' : 'Configure Key'}
              </button>
            </div>
          </div>
        ) : !isGenerating && generatedImages.every(img => img === null) ? (
           <div className="flex flex-col items-center justify-center h-full space-y-6">
             <div className="text-center space-y-4">
               <h3 className="text-2xl font-bold text-slate-800">{uiLanguage === 'zh' ? '准备生成幻灯片' : 'Ready to Generate Slides'}</h3>
               <p className="text-slate-500 max-w-md mx-auto">
                 {uiLanguage === 'zh' 
                   ? '我们将根据您的图片、大纲以及设定的风格生成高清幻灯片。' 
                   : 'We will generate high-definition slides based on your outline, images, and style.'}
               </p>
               <button 
                onClick={startGeneration}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg flex items-center mx-auto"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                {uiLanguage === 'zh' ? '开始生成设计' : 'Start Design Generation'}
              </button>
             </div>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto pb-12">
            {plan.slides.map((slide, i) => (
              <div key={slide.id} className="group relative rounded-xl shadow-lg overflow-hidden bg-white border border-slate-200 transition-all hover:ring-4 hover:ring-indigo-100">
                <div className="aspect-video bg-slate-100 relative flex items-center justify-center">
                  {generatedImages[i] ? (
                    <>
                      <img 
                        src={generatedImages[i]!} 
                        alt={`Slide ${i + 1}`} 
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setZoomImage(generatedImages[i]!)}
                      />
                      <div 
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer"
                        onClick={() => setZoomImage(generatedImages[i]!)}
                      >
                         <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full p-3 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                           <ZoomIn className="w-6 h-6 text-slate-800" />
                         </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center p-6 text-center w-full">
                       {isGenerating && progressIndex === i + 1 ? (
                         <>
                           <Spinner message={t.rendering} />
                           <p className="text-xs text-slate-400 mt-2 max-w-[200px] truncate">{slide.visualNote}</p>
                         </>
                       ) : isGenerating && progressIndex < i + 1 ? (
                         <div className="text-slate-400 font-medium">Waiting...</div>
                       ) : (
                         <div className="text-red-400 text-sm flex flex-col items-center">
                            <AlertCircle className="w-6 h-6 mb-1"/>
                            <span>Generation Failed</span>
                         </div>
                       )}
                    </div>
                  )}
                </div>
                <div className="p-3 flex justify-between items-center bg-white border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-600 truncate max-w-[150px]">{t.slide} {i + 1}: {slide.title}</span>
                  {generatedImages[i] && (
                    <a 
                      href={generatedImages[i]!} 
                      download={`slide_${i+1}.png`} 
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium px-2 py-1 rounded hover:bg-indigo-50"
                    >
                      {t.downloadImage}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200" onClick={() => setZoomImage(null)}>
          <button 
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={zoomImage} 
            alt="Zoomed Slide" 
            className="max-w-full max-h-full rounded shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
};
