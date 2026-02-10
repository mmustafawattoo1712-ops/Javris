import React, { useEffect, useRef, useState } from 'react';
import { Scan, Hand, Aperture, Maximize2, X, MousePointer2 } from 'lucide-react';

interface GestureOverlayProps {
  onGesture: (gesture: 'WAVE' | 'MOTION_LEFT' | 'MOTION_RIGHT') => void;
  isActive: boolean;
  isCursorMode?: boolean;
}

export const GestureOverlay: React.FC<GestureOverlayProps> = ({ onGesture, isActive, isCursorMode = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastGestureTime, setLastGestureTime] = useState(0);
  const [motionIntensity, setMotionIntensity] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  // Initialize Camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 320, 
                height: 240,
                frameRate: 30
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Gesture Camera Error:", err);
      }
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  // Motion Detection Loop
  useEffect(() => {
    if (!isActive) return;

    let animationFrame: number;
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    let prevImageData: Uint8ClampedArray | null = null;

    const processFrame = () => {
      if (!videoRef.current || !canvasRef.current || !ctx || videoRef.current.paused || videoRef.current.ended) {
        animationFrame = requestAnimationFrame(processFrame);
        return;
      }

      // Draw video frame to canvas
      const width = 64; // Low res for processing
      const height = 48;
      ctx.drawImage(videoRef.current, 0, 0, width, height);

      const frame = ctx.getImageData(0, 0, width, height);
      const data = frame.data;
      const len = data.length;

      let totalMotion = 0;
      let leftMotion = 0;
      let rightMotion = 0;
      
      let sumX = 0;
      let sumY = 0;
      let motionPixels = 0;

      if (prevImageData) {
        for (let i = 0; i < len; i += 4) {
          // Simple grayscale diff
          const diff = Math.abs(data[i] - prevImageData[i]);
          
          if (diff > 50) { // Threshold
             totalMotion++;
             
             const index = i / 4;
             const x = index % width;
             const y = Math.floor(index / width);

             if (x < width / 2) leftMotion++;
             else rightMotion++;

             if (isCursorMode) {
                 sumX += x;
                 sumY += y;
                 motionPixels++;
             }
          }
        }
      }

      // Store current frame
      prevImageData = new Uint8ClampedArray(data);

      // Normalize Motion
      const normalizedMotion = totalMotion / (width * height);
      setMotionIntensity(Math.min(1, normalizedMotion * 10)); // Visual feedback

      // --- CURSOR TRACKING ---
      if (isCursorMode && motionPixels > 10) { // Require minimum motion
          const avgX = sumX / motionPixels;
          const avgY = sumY / motionPixels;

          // Scale to screen
          const screenX = window.innerWidth - (avgX / width) * window.innerWidth; // Mirror X
          const screenY = (avgY / height) * window.innerHeight;
          
          // Lerp for smoothing
          setCursorPos(prev => ({
              x: prev.x + (screenX - prev.x) * 0.15,
              y: prev.y + (screenY - prev.y) * 0.15
          }));
      }

      // --- GESTURE LOGIC (Throttled) ---
      const now = Date.now();
      if (now - lastGestureTime > 1500) { // 1.5s cooldown
          if (normalizedMotion > 0.15) {
              // Big Wave
              onGesture('WAVE');
              setLastGestureTime(now);
          } else if (normalizedMotion > 0.05 && !isCursorMode) {
              // Directional (Disable in cursor mode to avoid conflicts)
              if (leftMotion > rightMotion * 1.5) {
                  // onGesture('MOTION_LEFT'); 
              } else if (rightMotion > leftMotion * 1.5) {
                  // onGesture('MOTION_RIGHT');
              }
          }
      }

      animationFrame = requestAnimationFrame(processFrame);
    };

    animationFrame = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationFrame);
  }, [isActive, lastGestureTime, onGesture, isCursorMode]);

  if (!isActive) return null;

  return (
    <>
        {/* Main Camera Widget */}
        <div 
            className={`fixed z-[200] transition-all duration-500 ease-out border border-cyan-500/50 bg-black/80 backdrop-blur-md overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.3)]
            ${isExpanded 
                ? 'top-0 left-0 right-0 bottom-0 m-0 rounded-none' 
                : 'top-6 right-6 w-32 h-24 md:w-48 md:h-36 rounded-xl'
            }`}
        >
            {/* Header HUD */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-cyan-950/50 flex items-center justify-between px-2 z-10">
                <div className="flex items-center gap-1">
                    <Aperture className={`w-3 h-3 text-cyan-400 ${motionIntensity > 0.1 ? 'animate-spin' : ''}`} />
                    <span className="text-[8px] font-mono text-cyan-400 tracking-widest">VISUAL_LINK</span>
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-cyan-400 hover:text-white">
                    {isExpanded ? <X className="w-3 h-3"/> : <Maximize2 className="w-3 h-3"/>}
                </button>
            </div>

            {/* Camera Feed */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover opacity-80 scale-x-[-1]" // Mirror effect
            />
            
            {/* Hidden Processing Canvas */}
            <canvas ref={canvasRef} width="64" height="48" className="hidden" />

            {/* Scanning Overlay */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Grid */}
                <div className="w-full h-full bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                
                {/* Scan Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-[scan_2s_linear_infinite]" />
                
                {/* Corners */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />

                {/* Detection Status */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                    {motionIntensity > 0.1 ? (
                        <div className="flex items-center gap-2 bg-red-900/80 px-2 py-0.5 rounded border border-red-500">
                            <Hand className="w-3 h-3 text-red-500" />
                            <span className="text-[8px] text-red-100 font-bold tracking-widest animate-pulse">MOVEMENT DETECTED</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-cyan-900/50 px-2 py-0.5 rounded">
                            <Scan className="w-3 h-3 text-cyan-400" />
                            <span className="text-[8px] text-cyan-200 font-mono tracking-widest">SCANNING...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* --- VIRTUAL MOUSE CURSOR --- */}
        {isCursorMode && (
            <div 
                className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out"
                style={{ 
                    transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)`,
                    filter: 'drop-shadow(0 0 10px rgba(6,182,212,0.8))'
                }}
            >
                <div className="relative">
                     <MousePointer2 className="w-8 h-8 text-cyan-400 fill-cyan-900/50 -rotate-12" />
                     {/* Ripple Effect */}
                     <div className="absolute top-0 left-0 w-full h-full animate-ping rounded-full border border-cyan-400 opacity-50" />
                     
                     {/* Target Reticle */}
                     <div className="absolute -top-4 -left-4 w-16 h-16 border border-dashed border-cyan-500/30 rounded-full animate-[spin_4s_linear_infinite]" />
                </div>
                <div className="absolute top-8 left-4 whitespace-nowrap">
                     <span className="bg-black/70 text-cyan-400 text-[10px] font-mono px-2 py-1 border border-cyan-500/50 rounded">
                         TARGET LOCKED
                     </span>
                </div>
            </div>
        )}
    </>
  );
};