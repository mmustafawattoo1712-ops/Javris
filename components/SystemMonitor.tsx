import React from 'react';
import { Wifi, Bluetooth, Battery, BatteryCharging, MapPin, Zap, AudioLines, Cloud, Server, BrainCircuit, Sun, Eye } from 'lucide-react';
import { DeviceState, ConnectionState } from '../types';

interface SystemMonitorProps {
  isConnected: boolean;
  deviceState: DeviceState;
  setBrightness: (level: number) => void;
  setMediaVolume: (level: number) => void;
  toggleSystemSetting: (setting: 'wifi' | 'bluetooth' | 'flashlight') => void;
  toggleProvider?: () => void; // New prop
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ isConnected, deviceState, setBrightness, setMediaVolume, toggleSystemSetting, toggleProvider }) => {
  const borderColor = isConnected || deviceState.aiProvider === 'ollama' ? 'border-cyan-500/30' : 'border-gray-800';

  return (
    <div className={`
      absolute top-24 right-4 md:right-8 w-48 
      flex flex-col gap-4 z-40
      transition-all duration-500
    `}>
      {/* HUD Header */}
      <div className={`p-3 rounded-lg border bg-black/60 backdrop-blur-md flex flex-col gap-3 ${borderColor}`}>
        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-[10px] font-tech text-gray-400">JARVIS SYSTEM</span>
            <div className={`flex items-center gap-2`}>
                <span className="text-[8px] font-mono text-cyan-600">
                    {deviceState.aiProvider === 'gemini' ? 'CLOUD' : 'LOCAL'}
                </span>
                <div className={`w-2 h-2 rounded-full ${isConnected || deviceState.aiProvider === 'ollama' ? 'bg-cyan-500 animate-pulse' : 'bg-red-900'}`} />
            </div>
        </div>
        
        {/* BRAIN SWITCHER */}
        <button 
            onClick={toggleProvider}
            className={`flex items-center justify-between p-2 rounded border transition-all duration-300 ${deviceState.aiProvider === 'gemini' ? 'bg-blue-900/20 border-blue-500/30' : 'bg-green-900/20 border-green-500/30'}`}
        >
            <div className="flex items-center gap-2">
                {deviceState.aiProvider === 'gemini' ? <Cloud className="w-3 h-3 text-blue-400" /> : <Server className="w-3 h-3 text-green-400" />}
                <span className="text-[9px] font-mono text-gray-300">
                    {deviceState.aiProvider === 'gemini' ? 'JARVIS AI' : 'OLLAMA CORE'}
                </span>
            </div>
            <BrainCircuit className="w-3 h-3 text-gray-500" />
        </button>

        {/* Battery Module */}
        <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
                {deviceState.isCharging ? 
                    <BatteryCharging className={`w-4 h-4 ${deviceState.batteryLevel && deviceState.batteryLevel < 20 ? 'text-red-500' : 'text-cyan-400'}`} /> : 
                    <Battery className={`w-4 h-4 ${deviceState.batteryLevel && deviceState.batteryLevel < 20 ? 'text-red-500' : 'text-gray-400'}`} />
                }
                <span className="text-xs font-mono">{deviceState.batteryLevel ?? '--'}%</span>
            </div>
            <span className="text-[9px] text-gray-500 uppercase">{deviceState.isCharging ? 'CHARGING' : 'DRAINING'}</span>
        </div>

        {/* Wake Lock Indicator (Only if Active) */}
        {deviceState.wakeLockActive && (
            <div className="flex items-center justify-between border-t border-gray-800/50 pt-2 animate-pulse">
                <div className="flex items-center gap-2">
                    <Sun className="w-3 h-3 text-yellow-500" />
                    <span className="text-[9px] text-yellow-500 font-bold">ALWAYS ON</span>
                </div>
            </div>
        )}

        {/* Brightness Module with Slider */}
        <div className="flex flex-col gap-1 pt-1 border-t border-gray-800/50">
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={deviceState.brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none"
            />
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-2 gap-2">
         {/* WiFi */}
         <button 
            onClick={() => toggleSystemSetting('wifi')}
            className={`
            p-2 rounded border flex flex-col items-center justify-center gap-1 transition-colors duration-300
            ${deviceState.wifi ? 'bg-cyan-900/30 border-cyan-500/50' : 'bg-black/40 border-gray-800'}
            hover:bg-cyan-900/50 cursor-pointer
         `}>
             <Wifi className={`w-5 h-5 ${deviceState.wifi ? 'text-cyan-400' : 'text-gray-600'}`} />
             <span className="text-[8px] font-bold tracking-widest text-gray-500">WIFI</span>
         </button>

         {/* Bluetooth */}
         <button 
            onClick={() => toggleSystemSetting('bluetooth')}
            className={`
            p-2 rounded border flex flex-col items-center justify-center gap-1 transition-colors duration-300
            ${deviceState.bluetooth ? 'bg-blue-900/30 border-blue-500/50' : 'bg-black/40 border-gray-800'}
            hover:bg-blue-900/50 cursor-pointer
         `}>
             <Bluetooth className={`w-5 h-5 ${deviceState.bluetooth ? 'text-blue-400' : 'text-gray-600'}`} />
             <span className="text-[8px] font-bold tracking-widest text-gray-500">BT-LINK</span>
         </button>

         {/* Flashlight */}
         <button 
            onClick={() => toggleSystemSetting('flashlight')}
            className={`
            p-2 rounded border flex flex-col items-center justify-center gap-1 transition-colors duration-300
            ${deviceState.flashlight ? 'bg-yellow-900/30 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/40 border-gray-800'}
            hover:bg-yellow-900/50 cursor-pointer
         `}>
             <Zap className={`w-5 h-5 ${deviceState.flashlight ? 'text-yellow-400' : 'text-gray-600'}`} />
             <span className="text-[8px] font-bold tracking-widest text-gray-500">TORCH</span>
         </button>

         {/* Status */}
         <div className={`
            p-2 rounded border flex flex-col items-center justify-center gap-1 transition-colors duration-300
            ${isConnected ? 'bg-green-900/30 border-green-500/50' : 'bg-black/40 border-gray-800'}
         `}>
             <AudioLines className={`w-5 h-5 ${isConnected ? 'text-green-400' : 'text-gray-600'}`} />
             <span className="text-[8px] font-bold tracking-widest text-gray-500">ACTIVE</span>
         </div>
      </div>
    </div>
  );
};