/** Control Panel - parameters, view mode, pipeline stages, export */

import { useState } from 'react';
import {
  Sliders, Eye, Layers, Download, Play,
  ChevronDown, ChevronRight, Zap, Grid3X3, Triangle
} from 'lucide-react';
import type { ViewMode, ReconstructParams, ReconstructResponse } from '../types';

interface ControlPanelProps {
  params: ReconstructParams;
  onParamsChange: (params: ReconstructParams) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onReconstruct: () => void;
  onDownload: (type: 'ply' | 'obj') => void;
  result: ReconstructResponse | null;
  loading: boolean;
  hasFile: boolean;
}

const PIPELINE_STAGES = [
  { id: 'depth', label: 'Depth Map Load', icon: Grid3X3, desc: 'Grayscale conversion & normalization to [0,1]' },
  { id: 'pointcloud', label: 'Point Cloud Gen', icon: Layers, desc: 'Pixel (u,v,depth) → 3D point mapping' },
  { id: 'downsample', label: 'Voxel Downsample', icon: Zap, desc: 'Reduce point density via voxel grid' },
  { id: 'normals', label: 'Normal Estimation', icon: Triangle, desc: 'KNN-based surface normal estimation' },
  { id: 'poisson', label: 'Poisson Reconstruction', icon: Grid3X3, desc: 'Implicit surface fitting & mesh extraction' },
];

export default function ControlPanel({
  params, onParamsChange, viewMode, onViewModeChange,
  onReconstruct, onDownload, result, loading, hasFile,
}: ControlPanelProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const viewModes: { mode: ViewMode; label: string; icon: typeof Eye }[] = [
    { mode: 'pointcloud', label: 'Point Cloud', icon: Layers },
    { mode: 'mesh', label: 'Mesh', icon: Triangle },
    { mode: 'wireframe', label: 'Wireframe', icon: Grid3X3 },
  ];

  return (
    <div className="w-[320px] bg-dark-800/60 backdrop-blur-xl border-r border-white/5 flex flex-col overflow-y-auto">
      {/* Panel Title */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-neon-purple" />
          <h2 className="text-sm font-semibold text-white">Controls</h2>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* Parameter Controls */}
        <div className="bg-dark-700/40 rounded-xl p-4 border border-white/5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parameters</h3>
          
          {/* Voxel Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Voxel Size</label>
              <span className="text-xs font-mono text-neon-cyan">{params.voxel_size.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={params.voxel_size}
              onChange={(e) => onParamsChange({ ...params, voxel_size: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-dark-600 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 
                [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:bg-neon-blue [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-neon-blue/30 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-600">
              <span>0.5</span><span>5.0</span><span>10.0</span>
            </div>
          </div>

          {/* Poisson Depth */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">Poisson Depth</label>
              <span className="text-xs font-mono text-neon-cyan">{params.poisson_depth}</span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              step="1"
              value={params.poisson_depth}
              onChange={(e) => onParamsChange({ ...params, poisson_depth: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-dark-600 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 
                [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:bg-neon-purple [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-neon-purple/30 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-600">
              <span>4</span><span>8</span><span>12</span>
            </div>
          </div>
        </div>

        {/* View Mode */}
        <div className="bg-dark-700/40 rounded-xl p-4 border border-white/5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Display Mode</h3>
          <div className="flex gap-1 bg-dark-900/50 rounded-lg p-1">
            {viewModes.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all
                  ${viewMode === mode
                    ? 'bg-neon-blue/20 text-neon-blue shadow-sm shadow-neon-blue/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="bg-dark-700/40 rounded-xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pipeline</h3>
          </div>
          <div className="divide-y divide-white/5">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.id}>
                <button
                  onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors"
                >
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                    ${result ? 'bg-neon-green/20 text-neon-green' : 'bg-dark-600 text-slate-500'}
                  `}>
                    {i + 1}
                  </div>
                  <stage.icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300 flex-1 text-left">{stage.label}</span>
                  {expandedStage === stage.id
                    ? <ChevronDown className="w-3 h-3 text-slate-500" />
                    : <ChevronRight className="w-3 h-3 text-slate-500" />
                  }
                </button>
                {expandedStage === stage.id && (
                  <div className="px-4 pb-3 pl-12">
                    <p className="text-[10px] text-slate-500 leading-relaxed">{stage.desc}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mt-auto">
          {/* Reconstruct Button */}
          <button
            onClick={onReconstruct}
            disabled={!hasFile || loading}
            className={`
              w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all
              ${hasFile && !loading
                ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-blue/25 hover:shadow-neon-blue/40 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-dark-600 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Reconstruct
              </>
            )}
          </button>

          {/* Download Buttons */}
          {result && (
            <div className="flex gap-2">
              <button
                onClick={() => onDownload('ply')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
                  bg-dark-600 border border-white/5 text-slate-300 hover:bg-dark-500 hover:text-white transition-all
                  animate-glow"
              >
                <Download className="w-3 h-3" />
                PLY
              </button>
              <button
                onClick={() => onDownload('obj')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
                  bg-dark-600 border border-white/5 text-slate-300 hover:bg-dark-500 hover:text-white transition-all
                  animate-glow"
              >
                <Download className="w-3 h-3" />
                OBJ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
