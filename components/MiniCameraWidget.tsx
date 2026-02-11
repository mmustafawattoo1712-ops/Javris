import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Video } from 'lucide-react';

interface MiniCameraWidgetProps {
    isConnected: boolean;
    sendVideoFrame: (base64: string) => void;
}

export const MiniCameraWidget: React.FC<MiniCameraWidgetProps> = ({ isConnected, sendVideoFrame }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraActive, setIsCameraActive] = useState(true);
    const intervalRef = useRef<number | null>(null);

    // Initialize Camera
    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                // Use front camera (user facing)
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 320 }, 
                        height: { ideal: 240 },
                        facingMode: "user"
                    } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.warn("Mini Camera Access Denied:", err);
                setIsCameraActive(false);
            }
        };

        if (isCameraActive) {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraActive]);

    // Frame Capture Loop (1 FPS)
    useEffect(() => {
        if (!isConnected || !isCameraActive) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = window.setInterval(() => {
            try {
                if (videoRef.current && canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        // Check if video is actually ready
                        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                            // Draw current video frame to canvas
                            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                            
                            // Convert to base64 JPEG
                            const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5); // 0.5 quality compression
                            
                            // Strip the prefix "data:image/jpeg;base64,"
                            const cleanBase64 = base64.split(',')[1];
                            
                            // Send to Jarvis
                            sendVideoFrame(cleanBase64);
                        }
                    }
                }
            } catch (e) {
                // Silent error suppression to avoid flooding console or crashing
            }
        }, 1000); // 1000ms = 1 second interval

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isConnected, isCameraActive, sendVideoFrame]);

    if (!isCameraActive && !isConnected) return null;

    return (
        <div className={`
            absolute top-24 left-4 z-[60] 
            transition-all duration-300
            ${isCameraActive ? 'w-32 h-24 md:w-40 md:h-30' : 'w-10 h-10'}
            border border-cyan-500/50 bg-black/80 backdrop-blur-md rounded-br-xl shadow-[0_0_15px_rgba(6,182,212,0.2)]
            overflow-hidden
        `}>
            {/* Header / Toggle */}
            <div 
                className="absolute top-0 left-0 right-0 h-6 bg-cyan-950/80 flex items-center justify-between px-2 cursor-pointer z-10"
                onClick={() => setIsCameraActive(!isCameraActive)}
            >
                <div className="flex items-center gap-1">
                    <Video className={`w-3 h-3 ${isCameraActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                    {isCameraActive && <span className="text-[8px] font-mono text-cyan-400 tracking-widest">MINI_CAM</span>}
                </div>
                <div className={`${isConnected && isCameraActive ? 'animate-pulse text-red-500' : 'text-gray-600'}`}>
                    {isCameraActive ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}
                </div>
            </div>

            {/* Video Feed */}
            {isCameraActive && (
                <>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]" // Mirror
                    />
                    
                    {/* Hidden Capture Canvas */}
                    <canvas ref={canvasRef} width="320" height="240" className="hidden" />

                    {/* Overlay Graphics */}
                    <div className="absolute inset-0 pointer-events-none">
                         <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-cyan-500" />
                         <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-cyan-500" />
                         
                         {/* Status Indicator */}
                         <div className="absolute bottom-1 right-2 flex items-center gap-1">
                             <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                             <span className="text-[6px] text-cyan-500 font-mono">{isConnected ? 'LIVE' : 'STBY'}</span>
                         </div>
                    </div>
                </>
            )}
        </div>
    );
};