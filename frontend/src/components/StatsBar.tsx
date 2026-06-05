/** Stats Bar - bottom statistics display with animated numbers */

import { useEffect, useState } from 'react';
import { BarChart3, Clock, CircleDot, Triangle } from 'lucide-react';
import type { ReconstructResponse } from '../types';

interface StatsBarProps {
  result: ReconstructResponse | null;
}

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = display;
    const diff = value - start;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

export default function StatsBar({ result }: StatsBarProps) {
  if (!result) {
    return (
      <div className="h-14 bg-dark-800/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-center px-6">
        <p className="text-xs text-slate-600">Upload a depth image and reconstruct to see statistics</p>
      </div>
    );
  }

  const { stats } = result;

  const items = [
    { label: 'Raw Points', value: stats.raw_points, icon: CircleDot, color: 'text-neon-cyan' },
    { label: 'Filtered', value: stats.filtered_points, icon: BarChart3, color: 'text-neon-green' },
    { label: 'Mesh Faces', value: stats.mesh_faces, icon: Triangle, color: 'text-neon-purple' },
    { label: 'Total Time', value: stats.timing.total_ms, icon: Clock, color: 'text-neon-blue', suffix: 'ms' },
  ];

  return (
    <div className="h-14 bg-dark-800/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-6">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <item.icon className={`w-4 h-4 ${item.color}`} />
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{item.label}</p>
            <p className="text-sm font-mono font-semibold text-white">
              <AnimatedNumber value={item.value} />
              {item.suffix && <span className="text-[10px] text-slate-400 ml-0.5">{item.suffix}</span>}
            </p>
          </div>
        </div>
      ))}

      {/* Timing breakdown */}
      <div className="h-8 w-px bg-white/5" />
      <div className="flex items-center gap-4 text-[10px]">
        <div>
          <span className="text-slate-500">PC: </span>
          <span className="text-slate-300 font-mono">{stats.timing.pointcloud_ms}ms</span>
        </div>
        <div>
          <span className="text-slate-500">Normal: </span>
          <span className="text-slate-300 font-mono">{stats.timing.normal_ms}ms</span>
        </div>
        <div>
          <span className="text-slate-500">Poisson: </span>
          <span className="text-slate-300 font-mono">{stats.timing.poisson_ms}ms</span>
        </div>
      </div>
    </div>
  );
}
