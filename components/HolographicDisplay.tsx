
import React, { useEffect, useState } from 'react';
import { Activity, Globe, Wifi, Cpu, Lock, Unlock, Database, HardDrive, Zap } from 'lucide-react';

interface HolographicDisplayProps {
  mode: 'none' | 'scanning' | 'hacking' | 'analysis' | 'database';
}

export const HolographicDisplay: React.FC<HolographicDisplayProps> = ({ mode }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (mode === 'none') return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 100 : prev + 1));
    }, 40); // Slightly faster for responsiveness
    return () => clearInterval(interval);
  }, [mode]);

  if (mode === 'none') return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
      
      {/* --- BACKGROUND RINGS (Standard Tech Look) --- */}
      <div className="absolute w-[600px] h-[600px] border border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
      <div className="absolute w-[500px] h-[500px] border-t border-b border-cyan-500/30 rounded-full animate-[spin_5s_reverse_linear_infinite]" />
      
      {/* --- MAIN HUD CONTENT --- */}
      <div className="relative z-40 w-full max-w-lg p-8 flex flex-col items-center">

        {/* --- 1. NETWORK SCANNING (Real Use Case: Searching for Wifi/Signals) --- */}
        {mode === 'scanning' && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48 flex items-center justify-center">
               <Wifi className="w-24 h-24 text-cyan-500 animate-pulse opacity-80" />
               <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full border-t-transparent animate-spin" />
               {/* Radar Blip */}
               <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(6,182,212,0.5)_360deg)] rounded-full animate-[spin_2s_linear_infinite] opacity-20" />
            </div>
            <div className="text-center">
                <div className="text-cyan-400 font-tech tracking-[0.5em] animate-pulse">NETWORK SCAN IN PROGRESS</div>
                <div className="text-xs text-cyan-700 font-mono mt-2">DETECTING SIGNALS... {progress}%</div>
            </div>
          </div>
        )}
        
        {/* --- 2. SECURITY OVERRIDE / APP UNLOCK (Hacking visual) --- */}
        {mode === 'hacking' && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="relative w-48 h-48 flex items-center justify-center border-2 border-red-500/50 rounded bg-black/50">
                {progress < 100 ? (
                    <Lock className="w-16 h-16 text-red-500 animate-pulse" /> 
                ) : (
                    <Unlock className="w-16 h-16 text-green-500 animate-bounce" />
                )}
            </div>
            <div className="text-center">
                <div className={`font-mono text-lg ${progress < 100 ? 'text-red-400' : 'text-green-400'}`}>
                    {progress < 100 ? 'BYPASSING SECURITY PROTOCOLS...' : 'ACCESS GRANTED'}
                </div>
                <div className="w-64 h-2 bg-gray-900 rounded mt-4 overflow-hidden border border-gray-700">
                    <div className={`h-full ${progress < 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${progress}%` }} />
                </div>
            </div>
          </div>
        )}

        {/* --- 3. SYSTEM ANALYSIS (Device Health) --- */}
        {mode === 'analysis' && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="relative w-64 h-64">
                <div className="absolute inset-0 animate-[spin_4s_linear_infinite] border-2 border-dashed border-cyan-500/30 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                    <Cpu className="w-12 h-12 text-cyan-300" />
                    <div className="text-xs font-mono text-cyan-500">CPU: NORMAL</div>
                </div>
                {/* Orbital Nodes */}
                <div className="absolute top-0 left-1/2 w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan]" />
                <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan]" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
                <div className="bg-cyan-900/20 border border-cyan-500/30 p-3 rounded flex items-center gap-3">
                    <Activity className="text-cyan-400 w-5 h-5" />
                    <div>
                        <div className="text-[10px] text-gray-400">MEMORY</div>
                        <div className="text-sm text-white font-bold">OPTIMIZED</div>
                    </div>
                </div>
                <div className="bg-cyan-900/20 border border-cyan-500/30 p-3 rounded flex items-center gap-3">
                    <Zap className="text-yellow-400 w-5 h-5" />
                    <div>
                        <div className="text-[10px] text-gray-400">POWER</div>
                        <div className="text-sm text-white font-bold">STABLE</div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* --- 4. DATABASE SEARCH (Searching Files/Contacts) --- */}
        {mode === 'database' && (
             <div className="flex flex-col items-center gap-4 w-full">
                 <div className="w-full h-56 bg-black/80 border border-cyan-900 p-4 rounded overflow-hidden relative shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                     <div className="absolute inset-0 opacity-40 flex flex-col gap-1 p-2">
                        {Array.from({length: 12}).map((_, i) => (
                            <div key={i} className="text-[10px] font-mono text-green-500 whitespace-nowrap overflow-hidden">
                                {`> SEARCHING_INDEX_${Math.floor(Math.random() * 9999)}... [OK]`}
                            </div>
                        ))}
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="bg-black/90 border border-cyan-500 p-6 rounded-xl text-center shadow-2xl">
                             <Database className="w-10 h-10 text-cyan-400 mx-auto mb-3 animate-pulse" />
                             <div className="text-sm text-white font-bold tracking-widest">QUERYING LOCAL STORAGE</div>
                             <div className="text-[10px] text-cyan-600 mt-1">CONTACTS • APPS • MEDIA</div>
                         </div>
                     </div>
                 </div>
                 <div className="w-full max-w-xs">
                     <div className="flex justify-between text-xs text-cyan-500 font-mono mb-1">
                         <span>SEARCH_PROGRESS</span>
                         <span>{progress}%</span>
                     </div>
                     <div className="w-full h-1 bg-gray-800 rounded overflow-hidden">
                         <div className="h-full bg-cyan-400" style={{ width: `${progress}%` }} />
                     </div>
                 </div>
             </div>
        )}

      </div>
    </div>
  );
};
