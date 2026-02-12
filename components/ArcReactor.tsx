
import React from 'react';

interface ArcReactorProps {
  volume: number;
  isActive: boolean;
  isUserSpeaking?: boolean;
  isError?: boolean; 
}

// Renamed internally to VoiceVisualizer to emphasize real-world utility over fiction
export const ArcReactor: React.FC<ArcReactorProps> = ({ volume, isActive, isUserSpeaking = false, isError = false }) => {
  const scale = 1 + (volume * 1.5); 
  const glowIntensity = isActive ? 0.5 + (volume * 2.0) : 0.2;
  
  // COLOR SYSTEM: Red (Alert/Speak), Cyan (Idle/Listening)
  let color = '100, 116, 139'; // Default Gray
  
  if (isError) {
      color = '239, 68, 68'; // RED (Error)
  } else if (isActive) {
      if (isUserSpeaking) {
          color = '239, 68, 68'; // RED (Input)
      } else {
          color = '6, 182, 212'; // CYAN (System Ready)
      }
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96 transition-colors duration-300">
      {/* Status Ring */}
      <div 
        className={`absolute inset-0 border-4 border-dashed rounded-full animate-[spin_10s_linear_infinite] opacity-30`}
        style={{ borderColor: `rgba(${color}, 0.3)` }}
      />
      
      {/* Static Boundary */}
      <div 
        className="absolute inset-4 border-2 rounded-full opacity-50"
        style={{ borderColor: `rgba(${color}, 0.5)` }}
      />

      {/* Audio Reactive Core Glow */}
      <div 
        className="absolute w-32 h-32 rounded-full blur-2xl transition-all duration-75 ease-out"
        style={{ 
          backgroundColor: `rgba(${color}, ${glowIntensity * 0.5})`,
          transform: `scale(${scale * 1.2})` 
        }}
      />

      {/* Main Interface Core */}
      <div 
        className="relative z-10 w-40 h-40 rounded-full border-4 flex items-center justify-center bg-black transition-all duration-75"
        style={{ 
            borderColor: `rgba(${color}, 0.8)`,
            boxShadow: `0 0 ${20 + volume * 100}px rgba(${color}, ${glowIntensity})`,
            transform: `scale(${scale})`
        }}
      >
        <div className="w-32 h-32 rounded-full border-2 border-white/20 flex items-center justify-center backdrop-blur-sm">
             <div className={`w-4 h-4 bg-white rounded-full shadow-[0_0_10px_white] ${isActive ? 'animate-pulse' : ''}`} />
        </div>
      </div>
      
      {/* System Axis Lines */}
      {(isActive || isError) && (
        <>
            <div 
                className="absolute top-1/2 left-0 w-full h-[1px] -translate-y-1/2" 
                style={{ background: `linear-gradient(90deg, transparent, rgba(${color}, 0.3), transparent)` }}
            />
            <div 
                className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2" 
                style={{ background: `linear-gradient(180deg, transparent, rgba(${color}, 0.3), transparent)` }}
            />
        </>
      )}
    </div>
  );
};
