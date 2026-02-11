import React from 'react';

interface ArcReactorProps {
  volume: number;
  isActive: boolean;
  isUserSpeaking?: boolean;
  isError?: boolean; // New Prop
}

export const ArcReactor: React.FC<ArcReactorProps> = ({ volume, isActive, isUserSpeaking = false, isError = false }) => {
  // Scale base size + volume reactivity (Much more sensitive now for "Hearing" visualization)
  const scale = 1 + (volume * 1.5); 
  const glowIntensity = isActive ? 0.5 + (volume * 2.0) : 0.2;
  
  // COLOR LOGIC: Red if Error or Speaking, Cyan if Active, Gray if Off
  let color = '100, 116, 139'; // Default Gray
  
  if (isError) {
      color = '239, 68, 68'; // RED (Error)
  } else if (isActive) {
      if (isUserSpeaking) {
          color = '239, 68, 68'; // RED (User Speaking)
      } else {
          color = '0, 225, 255'; // CYAN (Jarvis Idle/Thinking/Speaking)
      }
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96 transition-colors duration-300">
      {/* Outer Rotating Ring */}
      <div 
        className={`absolute inset-0 border-4 border-dashed rounded-full animate-[spin_10s_linear_infinite] opacity-30`}
        style={{ borderColor: `rgba(${color}, 0.3)` }}
      />
      
      {/* Middle Static Ring */}
      <div 
        className="absolute inset-4 border-2 rounded-full opacity-50"
        style={{ borderColor: `rgba(${color}, 0.5)` }}
      />

      {/* Core Glow */}
      <div 
        className="absolute w-32 h-32 rounded-full blur-2xl transition-all duration-75 ease-out"
        style={{ 
          backgroundColor: `rgba(${color}, ${glowIntensity * 0.5})`,
          transform: `scale(${scale * 1.2})` 
        }}
      />

      {/* The Core itself */}
      <div 
        className="relative z-10 w-40 h-40 rounded-full border-4 flex items-center justify-center bg-black transition-all duration-75"
        style={{ 
            borderColor: `rgba(${color}, 0.8)`,
            boxShadow: `0 0 ${20 + volume * 100}px rgba(${color}, ${glowIntensity})`, // Increased Glow
            transform: `scale(${scale})`
        }}
      >
        <div 
            className="w-32 h-32 rounded-full border-2 border-white/20 flex items-center justify-center"
        >
             {/* Inner Details */}
             <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_white]" />
        </div>
      </div>
      
      {/* Decorative HUD Lines */}
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