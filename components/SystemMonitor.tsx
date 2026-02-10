import React from 'react';
import { Wifi, Bluetooth, Battery, BatteryCharging, MapPin, Zap, Radio, Sun, Volume2, AudioLines } from 'lucide-react';
import { DeviceState } from '../types';

interface SystemMonitorProps {
  isConnected: boolean;
  deviceState: DeviceState;
  setBrightness: (level: number) => void;
  setMediaVolume: (level: number) => void;
  toggleSystemSetting: (setting: 'wifi' | 'bluetooth' | 'flashlight') => void;
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ isConnected, deviceState, setBrightness, setMediaVolume, toggleSystemSetting }) => {
  const borderColor = isConnected ? 'border-cyan-500/30' : 'border-gray-800';

  return (
    <div className={`
      absolute top-24 right-4 md:right-8 w-48 
      flex flex-col gap-4 z-40
      transition-all duration-500
    `}>
      {/* HUD Header */}
      <div className={`p-3 rounded-lg border bg-black/60 backdrop-blur-md flex flex-col gap-3 ${borderColor}`}>
        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-[10px] font-tech text-gray-400">DEVICE LINK</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-500 animate-pulse' : 'bg-red-900'}`} />
        </div>
        
        {/* Battery Module */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {deviceState.isCharging ? 
                    <BatteryCharging className={`w-4 h-4 ${deviceState.batteryLevel && deviceState.batteryLevel < 20 ? 'text-red-500' : 'text-cyan-400'}`} /> : 
                    <Battery className={`w-4 h-4 ${deviceState.batteryLevel && deviceState.batteryLevel < 20 ? 'text-red-500' : 'text-gray-400'}`} />
                }
                <span className="text-xs font-mono">{deviceState.batteryLevel ?? '--'}%</span>
            </div>
            <span className="text-[9px] text-gray-500 uppercase">{deviceState.isCharging ? 'CHARGING' : 'DRAINING'}</span>
        </div>

        {/* Location Module */}
        <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${deviceState.location ? 'text-cyan-400' : 'text-gray-600'}`} />
                <span className="text-[9px] font-mono tracking-tighter truncate max-w-[80px]">
                    {deviceState.location || "SEARCHING..."}
                </span>
             </div>
        </div>

        {/* Brightness Module with Slider */}
        <div className="flex flex-col gap-1 pt-1 border-t border-gray-800/50">
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Sun className={`w-4 h-4 ${deviceState.brightness > 50 ? 'text-yellow-400' : 'text-gray-600'}`} />
                    <span className="text-[9px] font-mono tracking-widest text-gray-500">LUMINOSITY</span>
                 </div>
                 <span className="text-[10px] font-mono text-cyan-400">{deviceState.brightness}%</span>
            </div>
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={deviceState.brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none"
            />
        </div>

        {/* Volume Module with Slider */}
        <div className="flex flex-col gap-1 pt-1 border-t border-gray-800/50">
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Volume2 className={`w-4 h-4 ${deviceState.volume > 50 ? 'text-green-400' : 'text-gray-600'}`} />
                    <span className="text-[9px] font-mono tracking-widest text-gray-500">AUDIO GAIN</span>
                 </div>
                 <span className="text-[10px] font-mono text-green-400">{deviceState.volume}%</span>
            </div>
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={deviceState.volume}
                onChange={(e) => setMediaVolume(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-green-500 hover:accent-green-400 focus:outline-none"
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

         {/* Noise Reduction (Replacing 'Net') */}
         <div className={`
            p-2 rounded border flex flex-col items-center justify-center gap-1 transition-colors duration-300
            ${isConnected ? 'bg-green-900/30 border-green-500/50' : 'bg-black/40 border-gray-800'}
         `}>
             <AudioLines className={`w-5 h-5 ${isConnected ? 'text-green-400' : 'text-gray-600'}`} />
             <span className="text-[8px] font-bold tracking-widest text-gray-500">N.R. ACTIVE</span>
         </div>
      </div>
      
      {/* Decorative Scanner Bar */}
      {isConnected && (
          <div className="w-full h-1 bg-gray-900 rounded overflow-hidden">
             <div className="h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent w-1/2 animate-[shimmer_2s_infinite]" />
          </div>
      )}
    </div>
  );
};