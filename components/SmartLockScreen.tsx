
import React, { useEffect, useRef, useState } from 'react';
import { ScanFace, Lock, Unlock, Fingerprint, ShieldCheck, AlertTriangle } from 'lucide-react';

interface SmartLockScreenProps {
  onUnlock: () => void;
}

export const SmartLockScreen: React.FC<SmartLockScreenProps> = ({ onUnlock }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'VERIFIED' | 'DENIED'>('IDLE');
  const [scanProgress, setScanProgress] = useState(0);

  // Initialize Camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 640, height: 480 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('SCANNING');
      } catch (err) {
        console.warn("Lock Screen Camera Error:", err);
        // Fallback if camera fails
      }
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Simulate Scanning Logic
  useEffect(() => {
    if (status === 'SCANNING') {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStatus('VERIFIED');
            return 100;
          }
          return prev + 2; // Speed of scan
        });
      }, 30);
      return () => clearInterval(interval);
    }

    if (status === 'VERIFIED') {
      const timeout = setTimeout(() => {
        onUnlock();
      }, 1500); // Wait 1.5s to show "Verified" message
      return () => clearTimeout(timeout);
    }
  }, [status, onUnlock]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-mono overflow-hidden">
      
      {/* BACKGROUND VIDEO FEED */}
      <div className="absolute inset-0 opacity-40">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover scale-x-[-1] grayscale contrast-125 brightness-75"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="absolute inset-0 bg-black/60 radial-mask" />
        <style>{`.radial-mask { mask-image: radial-gradient(circle at center, transparent 30%, black 100%); }`}</style>
      </div>

      {/* HUD OVERLAY */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* FACE RETICLE */}
        <div className="relative w-72 h-72 mb-8">
            {/* Rotating Rings */}
            <div className={`absolute inset-0 border-2 rounded-full border-cyan-500/30 ${status === 'SCANNING' ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
            <div className={`absolute inset-4 border border-dashed rounded-full border-cyan-500/50 ${status === 'SCANNING' ? 'animate-[spin_6s_reverse_linear_infinite]' : ''}`} />
            
            {/* Corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-500" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-500" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-500" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-500" />

            {/* Scan Line */}
            {status === 'SCANNING' && (
                <div className="absolute top-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_cyan] animate-[scan_1.5s_linear_infinite]" />
            )}

            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
                {status === 'VERIFIED' ? (
                     <ShieldCheck className="w-24 h-24 text-green-400 animate-in zoom-in duration-300" />
                ) : (
                     <ScanFace className="w-24 h-24 text-cyan-400/80" />
                )}
            </div>
        </div>

        {/* STATUS TEXT */}
        <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-bold tracking-[0.2em] text-white">
                {status === 'SCANNING' && "IDENTIFYING..."}
                {status === 'VERIFIED' && <span className="text-green-400">IDENTITY CONFIRMED</span>}
                {status === 'IDLE' && "SYSTEM LOCKED"}
            </h1>
            
            {status === 'SCANNING' && (
                <div className="w-64 h-1 bg-gray-800 rounded overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${scanProgress}%` }} />
                </div>
            )}

            <div className="text-xs text-cyan-600 mt-4 tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3" />
                SECURE BIOMETRIC ENTRY
            </div>

            {status === 'VERIFIED' && (
                <div className="mt-2 text-lg text-cyan-200 animate-pulse">
                    WELCOME BACK, SIR
                </div>
            )}
        </div>

        {/* Manual Override */}
        <button onClick={onUnlock} className="mt-12 opacity-50 hover:opacity-100 transition-opacity flex flex-col items-center gap-2">
            <Fingerprint className="w-8 h-8 text-cyan-500" />
            <span className="text-[9px] text-cyan-700 tracking-widest">MANUAL OVERRIDE</span>
        </button>

      </div>
    </div>
  );
};
