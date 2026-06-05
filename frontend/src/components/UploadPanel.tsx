/** Upload Panel - drag & drop depth image upload */

import { useCallback, useRef } from 'react';
import { Upload, Image, X, FileImage } from 'lucide-react';

interface UploadPanelProps {
  uploadedFile: File | null;
  imagePreview: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  loading: boolean;
}

export default function UploadPanel({ uploadedFile, imagePreview, onFileSelect, onClear, loading }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="w-[280px] bg-dark-800/60 backdrop-blur-xl border-r border-white/5 flex flex-col overflow-y-auto">
      {/* Panel Title */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-neon-blue" />
          <h2 className="text-sm font-semibold text-white">Depth Image</h2>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* Drop Zone */}
        {!uploadedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-3 
              border-2 border-dashed border-white/10 rounded-xl 
              p-6 cursor-pointer transition-all duration-300
              hover:border-neon-blue/50 hover:bg-neon-blue/5
              hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]
              ${loading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <div className="w-12 h-12 rounded-full bg-dark-600 flex items-center justify-center">
              <FileImage className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-slate-300">Drop depth image here</p>
              <p className="text-[10px] text-slate-500 mt-1">or click to browse</p>
              <p className="text-[10px] text-slate-600 mt-0.5">PNG / JPG supported</p>
            </div>
          </div>
        ) : (
          /* Preview */
          <div className="relative group">
            <div className="rounded-xl overflow-hidden border border-white/10 bg-dark-700">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Depth map preview"
                  className="w-full h-auto object-contain max-h-[200px]"
                />
              )}
            </div>
            {!loading && (
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-dark-900/80 border border-white/10 
                  flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-slate-300" />
              </button>
            )}
          </div>
        )}

        {/* File Info */}
        {uploadedFile && (
          <div className="bg-dark-700/50 rounded-lg p-3 border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <Image className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-xs font-medium text-slate-300 truncate">{uploadedFile.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-slate-500">Size</span>
                <p className="text-slate-300 font-mono">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <div>
                <span className="text-slate-500">Type</span>
                <p className="text-slate-300 font-mono">{uploadedFile.type.split('/')[1].toUpperCase()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="mt-auto">
          <div className="bg-dark-700/30 rounded-lg p-3 border border-white/5">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Upload a grayscale depth image. Brighter pixels represent closer surfaces. 
              The system will convert it to a 3D point cloud and reconstruct a mesh surface.
            </p>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/bmp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
