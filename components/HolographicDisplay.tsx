import React, { useEffect, useState } from 'react';
import { Activity, Globe, ShieldAlert, Cpu, ScanLine, Lock, Unlock, Zap, Dna } from 'lucide-react';

interface HolographicDisplayProps {
  mode: 'none' | 'scanning' | 'hacking' | 'analysis' | 'satellite';
}

export const HolographicDisplay: React.FC<HolographicDisplayProps> = ({ mode }) => {
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (mode === 'none') return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 100 : prev + 1));
    }, 50);
    return () => clearInterval(interval);
  }, [mode]);

  if (mode === 'none') return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
      
      {/* --- SCANNERS & RINGS --- */}
      <div className="absolute w-[600px] h-[600px] border border-cyan-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
      <div className="absolute w-[500px] h-[500px] border-t border-b border-cyan-500/20 rounded-full animate-[spin_5s_reverse_linear_infinite]" />
      
      {/* --- MAIN HUD CONTENT --- */}
      <div className="relative z-40 w-full max-w-lg p-8 flex flex-col items-center">
        
        {/* --- 1. BIOMETRIC SCANNING MODE --- */}
        {mode === 'scanning' && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48">
               <Dna className="w-full h-full text-cyan-500 animate-pulse opacity-80" />
               <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full border-t-transparent animate-spin" />
            </div>
            <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-cyan-300 font-mono">
                    <span>HEART RATE</span>
                    <span>{80 + Math.floor(Math.random() * 10)} BPM</span>
                </div>
                <div className="w-full h-1 bg-gray-900 rounded"><div className="h-full bg-red-500 w-[60%] animate-pulse" /></div>
                
                <div className="flex justify-between text-xs text-cyan-300 font-mono">
                    <span>OXYGEN LEVELS</span>
                    <span>98%</span>
                </div>
                <div className="w-full h-1 bg-gray-900 rounded"><div className="h-full bg-green-500 w-[98%]" /></div>
            </div>
            <div className="text-cyan-400 font-tech tracking-[0.5em] animate-pulse">SCANNING SUBJECT</div>
          </div>
        )}

        {/* --- 2. HACKING MODE --- */}
        {mode === 'hacking' && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="relative w-48 h-48 flex items-center justify-center border-2 border-red-500/50 rounded bg-black/50">
                {progress < 100 ? (
                    <Lock className="w-16 h-16 text-red-500 animate-pulse" />
                ) : (
                    <Unlock className="w-16 h-16 text-green-500 animate-bounce" />
                )}
                {/* Code Rain Effect (Simulated) */}
                <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
                     <div className="text-[10px] text-green-500 font-mono leading-3 break-all p-2">
                        {Array.from({length: 400}).map(() => Math.random() > 0.5 ? '1' : '0').join('')}
                     </div>
                </div>
            </div>
            
            <div className="w-full border border-red-900 bg-red-900/10 p-4 rounded font-mono text-xs text-red-400">
                <div className="flex justify-between mb-2">
                    <span>TARGET: FIREWALL_L7</span>
                    <span>PORT: 8080</span>
                </div>
                <div className="mb-1">BRUTE FORCE ATTACK:</div>
                <div className="w-full h-2 bg-gray-900"><div className="h-full bg-red-500" style={{ width: `${progress}%` }} /></div>
                <div className="mt-2 text-right">{progress < 100 ? 'DECRYPTING...' : 'ACCESS GRANTED'}</div>
            </div>
          </div>
        )}

        {/* --- 3. TECH ANALYSIS MODE --- */}
        {mode === 'analysis' && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-64 h-64 perspective-1000">
                {/* Rotating Cube/Structure */}
                <div className="w-32 h-32 border-2 border-cyan-400 mx-auto mt-16 animate-[spin_4s_linear_infinite] transform-style-3d shadow-[0_0_50px_cyan]">
                    <div className="absolute inset-0 bg-cyan-400/20" />
                    <Cpu className="absolute inset-0 m-auto w-16 h-16 text-white" />
                </div>
                {/* Data Lines */}
                <div className="absolute top-0 left-0 w-full h-full border border-dashed border-cyan-600/30 rounded-full animate-spin-slow" />
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
                <div className="bg-cyan-900/20 border border-cyan-500/30 p-2 rounded text-center">
                    <div className="text-[8px] text-cyan-400">INTEGRITY</div>
                    <div className="text-xl text-white font-bold">100%</div>
                </div>
                <div className="bg-cyan-900/20 border border-cyan-500/30 p-2 rounded text-center">
                    <div className="text-[8px] text-cyan-400">ENERGY</div>
                    <div className="text-xl text-white font-bold">400GJ</div>
                </div>
            </div>
            <div className="text-cyan-400 font-tech tracking-widest text-sm">MARK-85 SCHEMATIC</div>
          </div>
        )}

        {/* --- 4. SATELLITE MODE --- */}
        {mode === 'satellite' && (
           <div className="flex flex-col items-center gap-6">
               <div className="relative w-56 h-56 rounded-full border-2 border-cyan-500/50 overflow-hidden shadow-[0_0_30px_cyan]">
                   {/* Grid Globe Effect */}
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,255,255,0.2),transparent)]" />
                   <Globe className="w-full h-full text-cyan-800 animate-[spin_20s_linear_infinite] opacity-50" />
                   
                   {/* Scanning Reticle */}
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-red-500/50 rounded-full animate-ping" />
                   <Crosshair className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-red-500" />
               </div>
               
               <div className="flex flex-col gap-1 w-full font-mono text-xs text-cyan-300">
                   <div className="flex justify-between border-b border-cyan-800 pb-1">
                       <span>LAT: 34.0522 N</span>
                       <span>LNG: 118.2437 W</span>
                   </div>
                   <div className="flex justify-between pt-1">
                       <span>ALTITUDE: 250km</span>
                       <span className="text-green-400">LIVE FEED</span>
                   </div>
               </div>
           </div>
        )}

      </div>
    </div>
  );
};

// Helper Icon for Satellite
function Crosshair({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
    )
}