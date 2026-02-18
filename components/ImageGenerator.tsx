
import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { storageService } from '../services/storageService';
import { ImageIcon, SendIcon } from './Icons';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState(storageService.getImages());

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      // Using consolidated apiService
      const imageUrl = await apiService.generateImage(prompt);
      storageService.saveImage(prompt, imageUrl);
      setImages(storageService.getImages());
      setPrompt('');
    } catch (error: any) {
      const errorMsg = error.status === 429 
        ? "Rate limit exceeded. Try again in 60s." 
        : "Failed to generate image. Please check connectivity.";
      alert(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Image Studio</h2>
        <p className="text-slate-400">Transform your imagination into high-quality visual art.</p>
      </div>

      <div className="glass p-6 rounded-3xl border-slate-800 mb-8 shadow-2xl">
        <form onSubmit={handleGenerate} className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className="w-full bg-slate-900/50 border border-slate-700 focus:border-purple-500 rounded-2xl py-4 px-6 focus:ring-0 transition-all text-sm outline-none placeholder:text-slate-600"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              <ImageIcon />
            </div>
          </div>
          <button 
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-xl shadow-purple-500/10 disabled:shadow-none active:scale-95"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Creating...
              </span>
            ) : (
              <>Create <SendIcon /></>
            )}
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {images.map(img => (
            <div key={img.id} className="group glass rounded-3xl overflow-hidden border-slate-800 hover:border-purple-500/30 transition-all">
              <div className="aspect-square bg-slate-900 flex items-center justify-center overflow-hidden relative">
                <img src={img.url} alt={img.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = img.url;
                      link.download = `nova-ai-${img.id}.png`;
                      link.click();
                    }}
                    className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/20 transition-all text-white"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                   </button>
                </div>
              </div>
              <div className="p-4 bg-slate-900/50">
                <p className="text-xs text-slate-400 line-clamp-2 italic">"{img.prompt}"</p>
                <div className="mt-3 flex justify-between items-center">
                   <span className="text-[10px] text-slate-600">{new Date(img.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          {images.length === 0 && !isGenerating && (
            <div className="col-span-full py-20 text-center text-slate-500 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                <ImageIcon />
              </div>
              <p>No masterpieces yet. Start by typing a prompt above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
