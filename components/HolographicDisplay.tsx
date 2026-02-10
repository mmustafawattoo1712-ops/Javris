import React, { useEffect, useState } from 'react';
import { Activity, Globe, ShieldAlert, Cpu, ScanLine, Lock, Unlock, Zap, Dna, Rocket, Atom, Database, Shield } from 'lucide-react';

interface HolographicDisplayProps {
  mode: 'none' | 'scanning' | 'hacking' | 'analysis' | 'satellite' | 'suit' | 'sentry' | 'element' | 'flight' | 'database';
}

export const HolographicDisplay: React.FC<HolographicDisplayProps> = ({ mode }) => {
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
      
      {/* --- BACKGROUND RINGS (Common) --- */}
      <div className={`absolute w-[600px] h-[600px] border border-opacity-20 rounded-full animate-[spin_10s_linear_infinite] 
          ${mode === 'sentry' ? 'border-red-500' : 'border-cyan-500'}`} />
      <div className={`absolute w-[500px] h-[500px] border-t border-b border-opacity-30 rounded-full animate-[spin_5s_reverse_linear_infinite]
          ${mode === 'sentry' ? 'border-red-500' : 'border-cyan-500'}`} />
      
      {/* --- MAIN HUD CONTENT --- */}
      <div className="relative z-40 w-full max-w-lg p-8 flex flex-col items-center">
        
        {/* --- 1. SUIT DIAGNOSTICS (MARK 85) --- */}
        {mode === 'suit' && (
           <div className="flex flex-col items-center gap-6">
              <div className="relative w-64 h-64 perspective-1000">
                 {/* Simulated Wireframe Suit */}
                 <div className="w-40 h-40 border-2 border-cyan-400 mx-auto mt-10 animate-[spin_6s_linear_infinite] transform-style-3d shadow-[0_0_50px_cyan] rounded-full flex items-center justify-center">
                     <Shield className="w-20 h-20 text-cyan-200" />
                     <div className="absolute inset-0 border-4 border-dashed border-cyan-600/50 rounded-full animate-spin-slow" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full text-center">
                  <div className="p-2 border border-cyan-500/30 rounded bg-cyan-900/20">
                      <div className="text-[9px] text-cyan-400">ARMOR INTEGRITY</div>
                      <div className="text-xl text-white font-bold">98%</div>
                  </div>
                  <div className="p-2 border border-cyan-500/30 rounded bg-cyan-900/20">
                      <div className="text-[9px] text-cyan-400">POWER CELL</div>
                      <div className="text-xl text-white font-bold">400%</div>
                  </div>
              </div>
              <div className="text-cyan-400 font-tech tracking-[0.5em] animate-pulse">MARK 85 • ONLINE</div>
           </div>
        )}

        {/* --- 2. SENTRY MODE (HOUSE PARTY) --- */}
        {mode === 'sentry' && (
           <div className="flex flex-col items-center gap-6">
               <div className="relative w-56 h-56 flex items-center justify-center">
                   <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-20" />
                   <div className="absolute inset-0 border-2 border-red-500/50 rounded-full animate-[spin_3s_linear_infinite]" />
                   <ShieldAlert className="w-24 h-24 text-red-500 animate-pulse" />
                   <div className="absolute top-0 w-full text-center text-[10px] text-red-400 tracking-widest bg-black px-2">TARGETING</div>
               </div>
               <div className="flex flex-col items-center text-red-500 font-mono text-sm gap-1">
                   <div>ACTIVE HOSTILES: 0</div>
                   <div>IRON LEGION: DEPLOYED</div>
                   <div className="text-xs bg-red-900/30 px-4 py-1 rounded border border-red-500/30 mt-2 animate-pulse">
                       HOUSE PARTY PROTOCOL ENGAGED
                   </div>
               </div>
           </div>
        )}

        {/* --- 3. ELEMENT SYNTHESIS (BADASSIUM) --- */}
        {mode === 'element' && (
            <div className="flex flex-col items-center gap-6">
                <div className="relative w-64 h-64 flex items-center justify-center">
                    {/* Atom Shells */}
                    <div className="absolute w-full h-full border border-cyan-400/30 rounded-full animate-[spin_4s_linear_infinite]" />
                    <div className="absolute w-48 h-48 border border-cyan-400/50 rounded-full animate-[spin_3s_reverse_linear_infinite]" />
                    <div className="absolute w-32 h-32 border border-cyan-400/70 rounded-full animate-[spin_2s_linear_infinite]" />
                    {/* Nucleus */}
                    <Atom className="w-16 h-16 text-white drop-shadow-[0_0_20px_cyan] animate-pulse" />
                    {/* Prismatic Beam */}
                    <div className="absolute w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent opacity-50 blur-sm" />
                </div>
                <div className="text-center space-y-2">
                    <div className="text-xl text-white font-bold font-tech tracking-widest">NEW ELEMENT</div>
                    <div className="text-[10px] text-cyan-400 font-mono">ATOMIC STRUCTURE: STABLE</div>
                    <div className="w-48 h-1 bg-gray-800 mx-auto rounded overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>
        )}

        {/* --- 4. FLIGHT PATH --- */}
        {mode === 'flight' && (
             <div className="flex flex-col items-center gap-6">
                 <div className="relative w-56 h-56 rounded-full border-2 border-cyan-500/30 overflow-hidden shadow-[0_0_30px_cyan]">
                     <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] animate-[spin_20s_linear_infinite]" />
                     <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white -rotate-45" />
                     {/* Trajectory Line */}
                     <div className="absolute top-1/2 left-1/2 w-32 h-32 border-t-2 border-r-2 border-cyan-400 rounded-full opacity-50 -rotate-12" />
                 </div>
                 <div className="grid grid-cols-2 gap-8 text-xs font-mono text-cyan-300 w-full max-w-xs">
                      <div>
                          <div className="text-gray-500">ALTITUDE</div>
                          <div>45,000 FT</div>
                      </div>
                      <div className="text-right">
                          <div className="text-gray-500">SPEED</div>
                          <div>MACH 4.2</div>
                      </div>
                      <div>
                          <div className="text-gray-500">ETA</div>
                          <div>00:04:20</div>
                      </div>
                      <div className="text-right">
                          <div className="text-gray-500">DESTINATION</div>
                          <div className="text-white">LOCKED</div>
                      </div>
                 </div>
             </div>
        )}

        {/* --- 5. DATABASE SEARCH --- */}
        {mode === 'database' && (
             <div className="flex flex-col items-center gap-4 w-full">
                 <div className="w-full h-48 bg-black/50 border border-cyan-900 p-4 rounded overflow-hidden relative">
                     <div className="absolute inset-0 opacity-20">
                        {Array.from({length: 20}).map((_, i) => (
                            <div key={i} className="text-[10px] font-mono text-cyan-500 whitespace-nowrap animate-[scrollUp_5s_linear_infinite]" style={{ animationDelay: `${i * 0.2}s` }}>
                                SECURE_FILE_{Math.random().toString(36).substring(7).toUpperCase()} // CLASSIFIED // LEVEL_{Math.floor(Math.random()*10)}
                            </div>
                        ))}
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="bg-black/80 border border-cyan-500 p-4 rounded text-center">
                             <Database className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                             <div className="text-xs text-white font-bold tracking-widest">SEARCHING S.H.I.E.L.D. ARCHIVES</div>
                         </div>
                     </div>
                 </div>
                 <div className="flex gap-2 items-center text-cyan-400 text-xs font-mono">
                     <span className="animate-pulse">_ACCESSING...</span>
                     <span>{progress}%</span>
                 </div>
             </div>
        )}

        {/* --- 6. EXISTING MODES (Scanning, Hacking, Analysis, Satellite) --- */}
        {mode === 'scanning' && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48">
               <Dna className="w-full h-full text-cyan-500 animate-pulse opacity-80" />
               <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full border-t-transparent animate-spin" />
            </div>
            <div className="text-cyan-400 font-tech tracking-[0.5em] animate-pulse">SCANNING SUBJECT</div>
          </div>
        )}
        
        {mode === 'hacking' && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="relative w-48 h-48 flex items-center justify-center border-2 border-red-500/50 rounded bg-black/50">
                {progress < 100 ? <Lock className="w-16 h-16 text-red-500 animate-pulse" /> : <Unlock className="w-16 h-16 text-green-500 animate-bounce" />}
            </div>
            <div className="text-center text-red-400 font-mono">{progress < 100 ? 'BRUTE FORCE ATTACK...' : 'ACCESS GRANTED'}</div>
          </div>
        )}

        {mode === 'analysis' && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48 perspective-1000">
                <div className="w-32 h-32 border-2 border-cyan-400 mx-auto mt-8 animate-[spin_4s_linear_infinite] transform-style-3d shadow-[0_0_50px_cyan]">
                    <Cpu className="absolute inset-0 m-auto w-16 h-16 text-white" />
                </div>
            </div>
            <div className="text-cyan-400 font-tech tracking-widest">SYSTEM ANALYSIS</div>
          </div>
        )}

        {mode === 'satellite' && (
           <div className="flex flex-col items-center gap-6">
               <div className="relative w-56 h-56 rounded-full border-2 border-cyan-500/50 overflow-hidden shadow-[0_0_30px_cyan]">
                   <Globe className="w-full h-full text-cyan-800 animate-[spin_20s_linear_infinite] opacity-50" />
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-red-500 rounded-full" />
               </div>
               <div className="text-green-400 font-mono text-xs">LIVE FEED ACTIVE</div>
           </div>
        )}

      </div>
    </div>
  );
};