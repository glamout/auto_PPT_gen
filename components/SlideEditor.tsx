import React, { useRef, useState } from 'react';
import { SlideData, UploadedFile, Language, PresentationPlan } from '../types';
import { Image as ImageIcon, Check, Palette, X, PlusCircle, Upload } from 'lucide-react';
import { translations } from '../translations';

interface SlideEditorProps {
  plan: PresentationPlan;
  availableImages: UploadedFile[];
  uiLanguage: Language;
  onUpdatePlan: (updatedPlan: PresentationPlan) => void;
  onAddImages: (files: File[]) => Promise<UploadedFile[]>;
  onConfirm: () => void;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({
  plan,
  availableImages,
  uiLanguage,
  onUpdatePlan,
  onAddImages,
  onConfirm
}) => {
  const t = translations[uiLanguage];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdateSlide = (index: number, updatedSlide: SlideData) => {
    const newSlides = [...plan.slides];
    newSlides[index] = updatedSlide;
    onUpdatePlan({ ...plan, slides: newSlides });
  };

  const handleUpdateStyle = (newStyle: string) => {
    onUpdatePlan({ ...plan, style: newStyle });
  };

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    e.dataTransfer.setData('imageId', imageId);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      await onAddImages(Array.from(e.target.files));
      setIsUploading(false);
      // Clear input value so same files can be selected again if needed
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent, slideIndex: number) => {
    e.preventDefault();
    
    // Case 1: Internal Drag (from sidebar)
    const imageId = e.dataTransfer.getData('imageId');
    if (imageId) {
      const slide = plan.slides[slideIndex];
      const currentIds = slide.selectedImageIds || [];
      // Avoid duplicates
      if (!currentIds.includes(imageId)) {
        handleUpdateSlide(slideIndex, { 
          ...slide, 
          selectedImageIds: [...currentIds, imageId] 
        });
      }
      return;
    }

    // Case 2: External Drag (from desktop)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
      if (files.length > 0) {
        setIsUploading(true); // Ideally show a loading state on the specific card, using global loading for simplicity
        const newImages = await onAddImages(files);
        const newImageIds = newImages.map(img => img.id);
        
        const slide = plan.slides[slideIndex];
        const currentIds = slide.selectedImageIds || [];
        // Merge new images
        handleUpdateSlide(slideIndex, {
           ...slide,
           selectedImageIds: [...currentIds, ...newImageIds]
        });
        setIsUploading(false);
      }
    }
  };

  const removeImageFromSlide = (slideIndex: number, imageIdToRemove: string) => {
    const slide = plan.slides[slideIndex];
    const currentIds = slide.selectedImageIds || [];
    handleUpdateSlide(slideIndex, {
      ...slide,
      selectedImageIds: currentIds.filter(id => id !== imageIdToRemove)
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden relative">
      {/* Sidebar - Assets & Style */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-10 shrink-0">
        
        {/* Style Section */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center mb-2">
            <Palette className="w-4 h-4 mr-2 text-indigo-500" />
            {t.editStyle}
          </h3>
          <textarea 
            value={plan.style || ''}
            onChange={(e) => handleUpdateStyle(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none bg-white"
            placeholder={t.stylePlaceholder}
          />
        </div>

        {/* Assets Section */}
        <div className="p-4 border-b border-slate-100 mt-2 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800">{t.assetsTitle}</h3>
            <p className="text-xs text-slate-500 mt-1">{t.assetsSubtitle}</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
            title={t.addImages}
          >
            <PlusCircle className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileInputChange}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isUploading && (
             <div className="text-center p-4">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
             </div>
          )}
          {availableImages.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-200 rounded-lg whitespace-pre-line">
              {t.noAssets}
            </div>
          ) : (
            availableImages.map((img) => (
              <div 
                key={img.id}
                draggable
                onDragStart={(e) => handleDragStart(e, img.id)}
                className="cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-400 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative group"
              >
                <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover" />
                <div className="p-2 text-xs truncate text-slate-600">{img.name}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Slide List */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{t.reviewTitle}</h2>
            <p className="text-sm text-slate-500">{t.reviewSubtitle}</p>
          </div>
          <button 
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-md transition-colors"
          >
            <Check className="w-5 h-5 mr-2" />
            {t.generatePPT}
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-slate-100/50">
          {plan.slides.map((slide, index) => (
            <div 
              key={slide.id} 
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-4xl mx-auto flex gap-8 min-h-[300px]"
            >
              <div className="flex-1 space-y-4">
                <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide">{t.slide} {index + 1}</div>
                <input
                  value={slide.title}
                  onChange={(e) => handleUpdateSlide(index, { ...slide, title: e.target.value })}
                  className="w-full text-2xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                  placeholder={t.slideTitlePlaceholder}
                />
                <textarea
                  value={slide.bullets.join('\n')}
                  onChange={(e) => handleUpdateSlide(index, { ...slide, bullets: e.target.value.split('\n') })}
                  className="w-full h-64 text-slate-600 leading-relaxed border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded p-2 focus:outline-none resize-none bg-transparent"
                  placeholder={t.slideBulletsPlaceholder}
                />
              </div>

              {/* Image Drop Zone */}
              <div 
                className={`w-1/3 rounded-lg border-2 border-dashed flex flex-col transition-all relative overflow-hidden group min-h-[250px]
                  ${(slide.selectedImageIds && slide.selectedImageIds.length > 0)
                    ? 'border-indigo-500 bg-white' 
                    : 'border-slate-300 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 items-center justify-center'
                  }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                {(slide.selectedImageIds && slide.selectedImageIds.length > 0) ? (
                  <div className="p-2 w-full h-full flex flex-col">
                    <p className="text-xs text-indigo-600 font-bold mb-2 text-center bg-indigo-50 py-1 rounded">
                      {slide.selectedImageIds.length} Image(s) Selected
                    </p>
                    <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 p-1 content-start">
                      {slide.selectedImageIds.map(imgId => {
                         const imgData = availableImages.find(img => img.id === imgId);
                         return imgData ? (
                           <div key={imgId} className="relative group/img aspect-square rounded overflow-hidden border border-slate-200">
                             <img src={imgData.dataUrl} className="w-full h-full object-cover" alt="selected" />
                             <button 
                               onClick={() => removeImageFromSlide(index, imgId)}
                               className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity transform scale-75 hover:scale-100"
                             >
                               <X className="w-3 h-3" />
                             </button>
                           </div>
                         ) : null;
                      })}
                    </div>
                     <div className="text-center mt-2 text-xs text-slate-400">
                      {t.dropToReplace}
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <p className="text-sm text-center text-slate-500 font-medium">{t.dragImageHere}</p>
                    <p className="text-xs text-center text-slate-400 mt-2 italic border-t pt-2 border-slate-200 w-full px-2">
                      {t.aiSuggestion}<br/>{slide.visualNote}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};