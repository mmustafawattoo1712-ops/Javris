import React, { useEffect, useState } from 'react';
import { ShieldCheck, Crosshair, Wifi, Database } from 'lucide-react';

interface HolographicHudProps {
    isConnected: boolean;
}

export const HolographicHud: React.FC<HolographicHudProps> = ({ isConnected }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
      
      {/* 1. CORNER BRACKETS (Targeting System) */}
      <div className="absolute top-4 left-4 w-32 h-32 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-3xl" />
      <div className="absolute top-4 right-4 w-32 h-32 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-3xl" />
      <div className="absolute bottom-4 left-4 w-32 h-32 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-3xl" />
      <div className="absolute bottom-4 right-4 w-32 h-32 border-b-2 border-r-2 border-cyan-500/30 rounded-br-3xl" />
      
      {/* Inner Corner Accents */}
      <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-cyan-400" />
      <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-cyan-400" />
      <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-cyan-400" />
      <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-cyan-400" />

      {/* 2. CENTRAL CROSSHAIR RING */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] md:w-[700px] md:h-[700px] opacity-10 animate-[spin_120s_linear_infinite]">
         <div className="absolute inset-0 border border-cyan-500/20 rounded-full" />
         <div className="absolute inset-10 border border-dashed border-cyan-500/20 rounded-full" />
         <div className="absolute -top-4 left-1/2 text-[10px] text-cyan-800">N</div>
         <div className="absolute -bottom-4 left-1/2 text-[10px] text-cyan-800">S</div>
      </div>

      {/* 3. VERTICAL DATA STREAMS */}
      <div className="absolute top-1/4 left-12 flex flex-col gap-1 opacity-40">
           {Array.from({length: 10}).map((_,i) => (
               <div key={i} className="flex gap-2 text-[8px] text-cyan-600 font-mono">
                   <span>0x{Math.floor(Math.random()*255).toString(16).toUpperCase()}</span>
                   <div className="w-12 h-1 bg-cyan-900/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-cyan-500/50" style={{ width: `${Math.random()*100}%` }} />
                   </div>
               </div>
           ))}
      </div>
      
      <div className="absolute bottom-1/4 right-12 flex flex-col gap-2 items-end opacity-40">
           <div className="text-[10px] text-cyan-400 font-bold border-b border-cyan-500/50 mb-2">SYSTEM DIAGNOSTICS</div>
           <div className="flex items-center gap-2 text-[9px] text-cyan-300">
               <span>CPU LOAD</span>
               <div className="w-20 h-1.5 bg-gray-900"><div className="h-full bg-cyan-500 animate-pulse w-[40%]" /></div>
           </div>
           <div className="flex items-center gap-2 text-[9px] text-cyan-300">
               <span>MEMORY</span>
               <div className="w-20 h-1.5 bg-gray-900"><div className="h-full bg-cyan-500 w-[60%]" /></div>
           </div>
           <div className="flex items-center gap-2 text-[9px] text-cyan-300">
               <span>NETWORK</span>
               <div className="w-20 h-1.5 bg-gray-900"><div className="h-full bg-cyan-500 animate-pulse w-[85%]" /></div>
           </div>
      </div>

      {/* 4. HORIZON / LEVEL INDICATOR */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 h-12 flex items-end justify-center gap-1 opacity-50">
          <div className="w-px h-4 bg-cyan-500/30" />
          <div className="w-px h-6 bg-cyan-500/50" />
          <div className="w-px h-8 bg-cyan-500/80" />
          <div className="w-px h-12 bg-cyan-400 shadow-[0_0_10px_cyan]" />
          <div className="w-px h-8 bg-cyan-500/80" />
          <div className="w-px h-6 bg-cyan-500/50" />
          <div className="w-px h-4 bg-cyan-500/30" />
      </div>

      {/* 5. TOP INFO CLUSTER */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex gap-8">
           <div className="flex flex-col items-center">
               <ShieldCheck className={`w-4 h-4 ${isConnected ? 'text-cyan-400' : 'text-red-500'}`} />
               <span className="text-[8px] text-cyan-700 tracking-widest mt-1">ARMOR</span>
           </div>
           <div className="flex flex-col items-center">
               <Wifi className="w-4 h-4 text-cyan-400" />
               <span className="text-[8px] text-cyan-700 tracking-widest mt-1">LINK</span>
           </div>
           <div className="flex flex-col items-center">
               <Database className="w-4 h-4 text-cyan-400" />
               <span className="text-[8px] text-cyan-700 tracking-widest mt-1">DB</span>
           </div>
      </div>

      {/* 6. ROTATING SIDE RINGS */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-64 h-64 border border-cyan-500/10 rounded-full hidden md:block" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 border border-cyan-500/10 rounded-full hidden md:block" />

    </div>
  );
};