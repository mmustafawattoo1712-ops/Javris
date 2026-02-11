import React, { useEffect, useState } from 'react';
import { Target, Crosshair, Cpu, ChevronRight, Aperture } from 'lucide-react';

interface ActiveAppWindowProps {
  appName: string;
  onClose: () => void;
}

export const ActiveAppWindow: React.FC<ActiveAppWindowProps> = ({ appName, onClose }) => {
  const [lockLevel, setLockLevel] = useState(0);

  // Target Lock Sequence
  useEffect(() => {
    setLockLevel(0);
    const intervals = [
        setTimeout(() => setLockLevel(1), 500),  // Acquiring
        setTimeout(() => setLockLevel(2), 1000), // Locking
        setTimeout(() => setLockLevel(3), 1500), // Locked
        setTimeout(() => setLockLevel(4), 1800), // Firing (Launch)
    ];
    return () => intervals.forEach(clearTimeout);
  }, [appName]);

  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
        
        {/* ROTATING RINGS BACKGROUND */}
        <div className="absolute w-[120vw] h-[120vw] border border-cyan-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
        <div className="absolute w-[80vw] h-[80vw] border border-dashed border-cyan-500/10 rounded-full animate-[spin_15s_reverse_linear_infinite]" />
        
        {/* MAIN HUD CONTAINER */}
        <div className="relative w-80 h-80 flex items-center justify-center">
            
            {/* Outer Target Ring - Shrinks when locked */}
            <div className={`absolute border-2 border-cyan-500/50 rounded-full transition-all duration-500 ease-out
                ${lockLevel >= 3 ? 'w-48 h-48 border-red-500 shadow-[0_0_30px_red]' : 'w-72 h-72 border-cyan-500 animate-[spin_4s_linear_infinite]'}
            `}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-cyan-400" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-cyan-400" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-cyan-400" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-cyan-400" />
            </div>

            {/* Inner Rotating Elements */}
            <div className={`absolute w-56 h-56 border border-cyan-500/30 rounded-full transition-all duration-300 ${lockLevel >= 3 ? 'opacity-0' : 'animate-spin'}`} />
            
            {/* CENTRAL CONTENT */}
            <div className="flex flex-col items-center justify-center z-10 text-center">
                {lockLevel < 3 ? (
                    <Crosshair className="w-16 h-16 text-cyan-400 animate-pulse" />
                ) : (
                    <Target className="w-16 h-16 text-red-500 animate-ping" />
                )}
                
                <div className="mt-4 font-tech tracking-widest text-cyan-100 uppercase">
                    {lockLevel === 0 && "ACQUIRING SIGNAL..."}
                    {lockLevel === 1 && "BYPASSING SECURITY..."}
                    {lockLevel === 2 && "CALIBRATING..."}
                    {lockLevel === 3 && <span className="text-red-500 font-bold">TARGET LOCKED</span>}
                    {lockLevel === 4 && <span className="text-green-400 font-bold">EXECUTING PROTOCOL</span>}
                </div>
                
                <div className="mt-1 text-xs text-cyan-500 font-mono">
                    TARGET: <span className="text-white font-bold">{appName.toUpperCase()}</span>
                </div>
            </div>

            {/* CORNER DATA BLOCKS */}
            <div className="absolute top-10 right-0 text-[8px] text-cyan-600 font-mono text-right">
                <div>DIST: 0.00m</div>
                <div>WIND: 0.00m/s</div>
                <div>ELEV: 0.00</div>
            </div>
            <div className="absolute bottom-10 left-0 text-[8px] text-cyan-600 font-mono text-left">
                <div>PROT: TCP/IP</div>
                <div>PORT: 8080</div>
                <div>SEC: <span className="text-red-500">OFF</span></div>
            </div>

        </div>
    </div>
  );
};