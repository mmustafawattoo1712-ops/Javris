import React, { useEffect, useState } from 'react';
import { Terminal, ShieldCheck, Cpu, ExternalLink, Loader2 } from 'lucide-react';

interface ActiveAppWindowProps {
  appName: string;
  onClose: () => void;
}

export const ActiveAppWindow: React.FC<ActiveAppWindowProps> = ({ appName, onClose }) => {
  const [bootStep, setBootStep] = useState(0);

  // Boot Sequence Logic
  useEffect(() => {
    // Reset state
    setBootStep(0);

    const steps = [
        () => setBootStep(1), // "INITIALIZING PROTOCOL"
        () => setBootStep(2), // "BYPASSING SECURITY"
        () => setBootStep(3), // "INJECTING PAYLOAD"
        () => setBootStep(4), // "ACCESS GRANTED - LAUNCHING"
    ];

    let delay = 0;
    steps.forEach((step) => {
        delay += 400 + Math.random() * 300; // Random "hacking" delays
        setTimeout(step, delay);
    });

    return () => {};
  }, [appName]);

  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl perspective-1000 animate-in fade-in duration-300">
        <div className="w-full max-w-md p-8 font-mono text-cyan-500 relative overflow-hidden border border-cyan-500/20 rounded-xl bg-black shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            {/* Scanline */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none opacity-50" />
            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 opacity-50 animate-[scan_2s_linear_infinite]" />

            <div className="flex items-center gap-3 mb-6 border-b border-cyan-500/30 pb-4">
                {bootStep < 4 ? (
                    <Terminal className="w-6 h-6 animate-pulse" />
                ) : (
                    <ExternalLink className="w-6 h-6 animate-bounce text-green-400" />
                )}
                <span className="text-lg font-bold tracking-widest">
                    {bootStep < 4 ? "SYSTEM OVERRIDE" : "LAUNCHING EXTERNAL APP"}
                </span>
            </div>

            <div className="space-y-3 text-xs md:text-sm mb-6">
                <div className="flex justify-between items-center border-b border-gray-900 pb-1">
                    <span className="text-gray-500">TARGET PACKAGE:</span>
                    <span className="text-white uppercase font-bold">{appName}.apk</span>
                </div>
                
                <div className={`flex justify-between transition-all duration-300 ${bootStep >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                    <span>PROTOCOL:</span>
                    <span className="text-yellow-400">INITIATED</span>
                </div>
                
                <div className={`flex justify-between transition-all duration-300 ${bootStep >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                    <span>SECURITY:</span>
                    <span className="text-red-500 animate-pulse">BYPASSED</span>
                </div>

                <div className={`flex justify-between transition-all duration-300 ${bootStep >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                    <span>ROOT ACCESS:</span>
                    <span className="text-green-500">GRANTED</span>
                </div>

                {bootStep >= 4 && (
                     <div className="flex justify-between items-center mt-4 bg-green-900/20 p-2 rounded border border-green-500/30 animate-pulse">
                        <span className="text-green-400 font-bold">REDIRECTING TO OS...</span>
                        <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                    </div>
                )}
            </div>

            {/* Loading Bar */}
            <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden relative">
                <div 
                    className={`h-full transition-all duration-500 ease-out ${bootStep >= 4 ? 'bg-green-500' : 'bg-cyan-500'}`}
                    style={{ width: `${Math.min(100, (bootStep + 1) * 25)}%` }} 
                />
            </div>
            
            <div className="mt-4 flex justify-between items-end">
                <Cpu className="w-4 h-4 text-gray-700" />
                <div className="text-[10px] text-gray-600 text-right">
                    MK-85 PROCESSOR // {Math.floor(Math.random() * 9999)}<br/>
                    <span className="text-cyan-900">INTENT.ACTION.MAIN</span>
                </div>
            </div>
        </div>
    </div>
  );
};