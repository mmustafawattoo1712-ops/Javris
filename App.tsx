import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Power, Activity, Terminal, Fingerprint, ScanFace, Globe, ShieldCheck, Lock, LogIn } from 'lucide-react';
import { useJarvis } from './hooks/useJarvis';
import { useWakeWord } from './hooks/useWakeWord';
import { ArcReactor } from './components/ArcReactor';
import { ChatLog } from './components/ChatLog';
import { SystemMonitor } from './components/SystemMonitor';
import { HomeScreen } from './components/HomeScreen';
import { HolographicHud } from './components/HolographicHud';
import { ActiveAppWindow } from './components/ActiveAppWindow';
import { HolographicDisplay } from './components/HolographicDisplay';
import { MiniCameraWidget } from './components/MiniCameraWidget';
import { VirtualMobile } from './components/VirtualMobile';
import { ConnectionState } from './types';

const App: React.FC = () => {
  const { 
      connectionState, 
      connect, 
      disconnect, 
      messages, 
      volume, 
      error, 
      deviceState, 
      activeApp,
      closeActiveApp,
      resetInterface,
      setBrightness, 
      setMediaVolume, 
      toggleSystemSetting, 
      closeApplication, 
      openApplication, 
      toggleHome,
      unlockSystem,
      sendVideoFrame,
      executeAppCommand,
      toggleMobile,
      isUserSpeaking,
      incomingCall, // New
      incomingMessage // New
  } = useJarvis();

  const [showLogs, setShowLogs] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // To handle AudioContext auto-play policy
  const [bootSequence, setBootSequence] = useState(false);

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  // Wake Word Handler
  const handleWake = useCallback(() => {
      if (connectionState === ConnectionState.DISCONNECTED && !isConnecting && deviceState.systemStatus === 'online') {
          // Play a system sound if possible
          const audio = new Audio('https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_100KB_MP3.mp3'); // Placeholder beep
          audio.volume = 0.2;
          audio.play().catch(() => {});
          connect();
      }
  }, [connectionState, isConnecting, connect, deviceState.systemStatus]);

  const { isListening, startListening, stopListening } = useWakeWord(handleWake);

  // Initial interaction handler (Browser Security)
  const handleInteraction = () => {
      setHasInteracted(true);
      setBootSequence(true);
      // Start listening for wake word after user has interacted once
      startListening();
      
      // Enter fullscreen for immersion
      try {
          if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen();
          }
      } catch (e) {}
  };

  useEffect(() => {
      // CRITICAL FIX: Stop listening if connected OR connecting to free up the microphone
      if (isConnected || isConnecting) {
          stopListening();
      } else if (hasInteracted && deviceState.systemStatus === 'online') {
          startListening();
      }
  }, [isConnected, isConnecting, hasInteracted, startListening, stopListening, deviceState.systemStatus]);

  // --- SYSTEM SHUTDOWN VISUAL ---
  if (deviceState.systemStatus === 'shutdown') {
      return (
          <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center cursor-pointer" onClick={unlockSystem}>
             {/* Subtle power indicator to show it's "off" but recoverable */}
             <div className="w-1 h-1 bg-gray-900 rounded-full animate-pulse" />
          </div>
      );
  }

  // --- LOCK SCREEN VISUAL ---
  if (deviceState.systemStatus === 'locked') {
      return (
          <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-cyan-500 font-mono relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)] opacity-50" />
              
              <div className="z-10 flex flex-col items-center gap-8">
                  <div className="p-6 border-2 border-cyan-500/30 rounded-full bg-black/50 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                      <Lock className="w-12 h-12 text-cyan-400" />
                  </div>
                  
                  <div className="text-center">
                       <h1 className="text-6xl font-thin tracking-tighter text-white mb-2">
                           {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                       </h1>
                       <p className="text-sm tracking-[0.5em] text-cyan-700">SYSTEM LOCKED</p>
                  </div>

                  <button 
                    onClick={unlockSystem}
                    className="mt-12 group flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
                  >
                      <Fingerprint className="w-8 h-8 text-cyan-400 animate-pulse" />
                      <span className="text-[10px] tracking-widest">TAP TO AUTHENTICATE</span>
                  </button>
              </div>

              {/* Bottom security footer */}
              <div className="absolute bottom-8 text-[8px] text-gray-700 tracking-widest flex gap-4">
                  <span>BIOMETRICS: ACTIVE</span>
                  <span>ENCRYPTION: AES-256</span>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-black text-cyan-400 relative overflow-hidden flex flex-col items-center justify-center selection:bg-cyan-500/30 perspective-container font-mono">
      
      {/* 3D Styles */}
      <style>{`
        .perspective-container { perspective: 1500px; }
        .hud-text { text-shadow: 0 0 5px rgba(6,182,212,0.8); }
        .scan-line {
            background: linear-gradient(to bottom, transparent, rgba(6,182,212,0.5), transparent);
            animation: scan 3s linear infinite;
        }
        @keyframes scan {
            0% { transform: translateY(-100vh); }
            100% { transform: translateY(100vh); }
        }
      `}</style>

      {/* --- INITIAL INTERACTION LAYER (BOOT SCREEN) --- */}
      {!hasInteracted && (
          <div 
            onClick={handleInteraction}
            className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center cursor-pointer"
          >
              <div className="relative">
                  <Fingerprint className="w-24 h-24 text-cyan-500 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30 animate-[ping_2s_infinite]" />
              </div>
              <h1 className="mt-8 text-2xl font-tech tracking-[0.5em] text-cyan-400 animate-pulse">SYSTEM LOCKED</h1>
              <p className="mt-2 text-xs text-cyan-700 tracking-widest">TOUCH TO INITIALIZE PROTOCOL</p>
          </div>
      )}

      {/* --- MAIN HUD INTERFACE --- */}
      {hasInteracted && (
          <>
            {/* Background Effects (Always visible for ambiance) */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)] pointer-events-none" />
            <div className="fixed inset-0 opacity-20 pointer-events-none bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="fixed inset-0 pointer-events-none scan-line opacity-10" />

            {/* Brightness/Flashlight Overlays */}
            <div className="fixed inset-0 bg-black pointer-events-none z-[200] transition-opacity duration-500" style={{ opacity: 1 - (deviceState.brightness / 100) }} />
            <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-300 z-[100] mix-blend-overlay ${deviceState.flashlight ? 'opacity-90' : 'opacity-0'}`} />

            {/* --- CONDITIONAL UI RENDERING --- */}
            {/* Only render JARVIS HUD elements if Mobile is NOT shown */}
            {!deviceState.showMobile && (
              <>
                <HolographicHud isConnected={isConnected} />
                <HolographicDisplay mode={deviceState.simulationMode} />

                {/* TOP HEADER HUD */}
                <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold tracking-[0.2em] text-cyan-300 hud-text">MK-85 OS</span>
                        </div>
                        <div className="text-[10px] text-cyan-600 tracking-widest pl-6">START SYSTEM</div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold tracking-[0.2em] text-cyan-300 hud-text">
                                {isConnected ? 'ONLINE' : isListening ? 'STANDBY' : 'OFFLINE'}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : isListening ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                        </div>
                        <div className="text-[10px] text-cyan-600 tracking-widest">VOICE MODULE: {isListening ? 'ACTIVE' : 'PAUSED'}</div>
                    </div>
                </header>
              </>
            )}

            {/* MAIN CONTENT AREA */}
            <main className="relative z-10 flex flex-col items-center justify-center w-full h-full p-4">
                
                {/* ERROR ALERT */}
                {error && (
                    <div className="absolute top-24 bg-red-900/20 border border-red-500 text-red-400 px-6 py-2 rounded backdrop-blur-md max-w-md text-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                        <span className="font-bold block text-xs tracking-widest mb-1">SYSTEM ALERT</span>
                        {error}
                    </div>
                )}

                {/* Only Show Arc Reactor & Standard Widgets if Mobile is hidden */}
                {!deviceState.showMobile && (
                  <>
                    {/* CENTRAL VISUALIZER */}
                    <div className={`relative mb-8 transform transition-all duration-700 ${deviceState.simulationMode !== 'none' ? 'scale-75 opacity-50 blur-sm' : 'scale-100'}`}>
                        {/* Passed isUserSpeaking to Reactor */}
                        <ArcReactor volume={volume} isActive={isConnected} isUserSpeaking={isUserSpeaking} />
                        
                        {/* Standby Pulse */}
                        {!isConnected && isListening && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-64 h-64 border border-cyan-500/20 rounded-full animate-ping opacity-20" />
                                <div className="absolute mt-40 text-center">
                                    <p className="text-xs text-cyan-600 tracking-[0.3em] animate-pulse">LISTENING (URDU)...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MANUAL OVERRIDE BUTTON */}
                    <div className="absolute bottom-24 flex gap-4 pointer-events-auto">
                        {!isConnected && (
                            <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="group relative px-6 py-2 border border-cyan-500/30 bg-cyan-900/10 hover:bg-cyan-500/20 rounded backdrop-blur-sm transition-all active:scale-95"
                            >
                            <span className="text-xs font-bold tracking-[0.2em] text-cyan-400 group-hover:text-cyan-200">
                                {isConnecting ? 'INITIALIZING...' : 'MANUAL OVERRIDE'}
                            </span>
                            </button>
                        )}
                        
                        {isConnected && (
                            <button
                            onClick={disconnect}
                            className="group relative px-6 py-2 border border-red-500/30 bg-red-900/10 hover:bg-red-500/20 rounded backdrop-blur-sm transition-all active:scale-95"
                            >
                            <span className="text-xs font-bold tracking-[0.2em] text-red-400 group-hover:text-red-200">
                                ABORT LINK
                            </span>
                            </button>
                        )}
                    </div>

                    {/* ACTIVE APP / HACKING WINDOW */}
                    {activeApp && (
                        <ActiveAppWindow appName={activeApp} onClose={closeActiveApp} />
                    )}

                    {/* APP GRID MODE (Only if mobile hidden) */}
                    {deviceState.viewMode === 'home' && (
                        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg animate-[scaleIn_0.3s_ease-out]">
                            <HomeScreen onOpenApp={openApplication} />
                            <button 
                            onClick={toggleHome}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cyan-400 border border-cyan-500/50 px-4 py-2 rounded-full hover:bg-cyan-900/50"
                            >
                                CLOSE GRID
                            </button>
                        </div>
                    )}
                  </>
                )}

                {/* VIRTUAL MOBILE INTERFACE (Exclusive when shown) */}
                <VirtualMobile 
                    isVisible={deviceState.showMobile} 
                    onClose={toggleMobile}
                    onOpenApp={executeAppCommand}
                    batteryLevel={deviceState.batteryLevel}
                    incomingCall={incomingCall} // New Prop
                    incomingMessage={incomingMessage} // New Prop
                />

            </main>

            {/* SIDE MONITORS & LOGS - Only if mobile is hidden */}
            {!deviceState.showMobile && (
              <>
                {/* RIGHT SIDE MONITOR */}
                <SystemMonitor 
                    isConnected={isConnected} 
                    deviceState={deviceState} 
                    setBrightness={setBrightness} 
                    setMediaVolume={setMediaVolume}
                    toggleSystemSetting={toggleSystemSetting}
                />

                {/* LEFT SIDE MINI CAMERA WIDGET */}
                <MiniCameraWidget 
                    isConnected={isConnected} 
                    sendVideoFrame={sendVideoFrame} 
                />

                {/* BOTTOM LOGS */}
                {showLogs && <ChatLog messages={messages} />}

                {/* FOOTER CONTROLS */}
                <footer className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-40 pointer-events-none">
                    <div className="pointer-events-auto">
                        <button 
                            onClick={() => setShowLogs(!showLogs)}
                            className={`p-2 rounded border transition-all ${showLogs ? 'border-cyan-400 text-cyan-400 bg-cyan-900/30' : 'border-cyan-900/50 text-cyan-700 hover:border-cyan-500/50'}`}
                        >
                            <Terminal className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 text-[10px] text-cyan-800 font-mono tracking-widest">
                        <div>SECURE CONNECTION: {isConnected ? 'ESTABLISHED' : 'WAITING'}</div>
                        <div>LATENCY: {isConnected ? '12ms' : '--'}</div>
                    </div>
                </footer>
              </>
            )}
          </>
      )}
    </div>
  );
};
export default App;
