
import React, { forwardRef } from 'react';
import { SlideData, UploadedFile } from '../types';

interface SlideRendererProps {
  slide: SlideData;
  availableImages: UploadedFile[];
  scale?: number;
}

export const SlideRenderer = forwardRef<HTMLDivElement, SlideRendererProps>(({ slide, availableImages, scale = 1 }, ref) => {
  // Backwards compatibility: use the first selected image if multiple are present
  const firstImageId = slide.selectedImageIds && slide.selectedImageIds.length > 0 ? slide.selectedImageIds[0] : undefined;
  const selectedImage = availableImages.find(img => img.id === firstImageId);
  const bgImage = selectedImage?.dataUrl 
    ? `url(${selectedImage.dataUrl})` 
    : `url(https://picsum.photos/800/600?random=${slide.id})`; 
  
  return (
    <div 
      ref={ref}
      style={{
        width: '1280px',
        height: '720px',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
      className="bg-white relative overflow-hidden flex shadow-2xl"
    >
        {/* Layout: Split Screen */}
        <div className="w-1/2 p-16 flex flex-col justify-center bg-white z-10">
          <div className="w-20 h-2 bg-indigo-600 mb-8"></div>
          <h1 className="text-5xl font-extrabold text-slate-900 leading-tight mb-8">
            {slide.title}
          </h1>
          <ul className="space-y-4">
            {slide.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start text-2xl text-slate-600 leading-snug">
                <span className="w-2 h-2 rounded-full bg-indigo-400 mt-3 mr-4 flex-shrink-0"></span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="w-1/2 relative h-full bg-slate-100">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: bgImage }}
          ></div>
           <div className="absolute inset-0 bg-indigo-900/10"></div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-16 right-16 flex justify-between items-center text-slate-400 text-sm border-t border-slate-100 pt-4">
          <span>AutoDeck AI</span>
          <span>{slide.id}</span>
        </div>
    </div>
  );
});

SlideRenderer.displayName = 'SlideRenderer';
