/** Header component - top navigation bar */

import { Activity, Box } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
}

export default function Header({ connected }: HeaderProps) {
  return (
    <header className="h-14 bg-dark-800/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 relative z-10">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-blue to-neon-violet flex items-center justify-center shadow-lg shadow-neon-blue/20">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Depth to 3D
          </h1>
          <p className="text-[10px] text-slate-500 -mt-0.5">
            Point Cloud & Mesh Reconstruction
          </p>
        </div>
      </div>

      {/* Center: Pulse indicator */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse-slow" />
        <span className="text-xs text-slate-500 font-medium">Reconstruction Engine</span>
        <div className="w-1.5 h-1.5 rounded-full bg-neon-violet animate-pulse-slow" />
      </div>

      {/* Right: Connection status */}
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-slate-500" />
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-neon-green' : 'bg-red-500'} ${connected ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-slate-500">
          {connected ? 'Connected' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
