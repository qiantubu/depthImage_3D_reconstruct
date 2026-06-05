/** Root App component - three-column layout */

import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import ControlPanel from './components/ControlPanel';
import Viewer3D from './components/Viewer3D';
import StatsBar from './components/StatsBar';
import { useReconstruct } from './hooks/useReconstruct';
import { healthCheck } from './services/api';
import type { ReconstructParams } from './types';

export default function App() {
  const {
    result, loading, error, viewMode,
    uploadedFile, imagePreview,
    startReconstruction, setViewMode, setUploadedFile,
    getDownload, reset,
  } = useReconstruct();

  const [connected, setConnected] = useState(false);
  const [params, setParams] = useState<ReconstructParams>({
    voxel_size: 2.0,
    poisson_depth: 8,
  });

  // Check backend health on mount
  useEffect(() => {
    healthCheck().then(setConnected);
    const interval = setInterval(() => {
      healthCheck().then(setConnected);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleReconstruct = useCallback(() => {
    if (uploadedFile) {
      startReconstruction(uploadedFile, params);
    }
  }, [uploadedFile, params, startReconstruction]);

  const handleDownload = useCallback((type: 'ply' | 'obj') => {
    const url = getDownload(type);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconstruction.${type}`;
      a.click();
    }
  }, [getDownload]);

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-900 text-white overflow-hidden">
      <Header connected={connected} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Upload Panel */}
        <UploadPanel
          uploadedFile={uploadedFile}
          imagePreview={imagePreview}
          onFileSelect={setUploadedFile}
          onClear={handleClear}
          loading={loading}
        />

        {/* Center: Control Panel */}
        <ControlPanel
          params={params}
          onParamsChange={setParams}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onReconstruct={handleReconstruct}
          onDownload={handleDownload}
          result={result}
          loading={loading}
          hasFile={!!uploadedFile}
        />

        {/* Right: 3D Viewer */}
        <Viewer3D
          result={result}
          viewMode={viewMode}
          loading={loading}
        />
      </div>

      {/* Bottom: Stats Bar */}
      <StatsBar result={result} />

      {/* Error Toast */}
      {error && (
        <div className="absolute top-20 right-6 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 
          backdrop-blur-xl shadow-lg shadow-red-500/10 max-w-sm z-50">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
