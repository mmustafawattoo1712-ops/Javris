import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, MessageSquare, Camera, Image as ImageIcon, Settings, Globe, Youtube, Wifi, Battery, 
  ChevronLeft, Search, User, Map, Mail, Music, Video, Calendar, Clock, Calculator, 
  Terminal, ShieldCheck, X, ChevronDown, Zap, Bluetooth, Signal, Bell, GripHorizontal, LayoutGrid
} from 'lucide-react';
import { IncomingCall, IncomingMessage, DeviceState } from '../types';
import { MANIFEST_CODE, PIPELINE_CODE } from '../utils/androidSnippets';

interface VirtualMobileProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenApp: (appName: string, actionType: string, payload?: string) => void;
  deviceState: DeviceState;
  toggleSystemSetting: (setting: 'wifi' | 'bluetooth' | 'flashlight') => void;
  incomingCall?: IncomingCall | null; 
  incomingMessage?: IncomingMessage | null;
  externalActiveApp?: string | null; 
}

const ALL_APPS = [
    { id: 'phone_internal', name: 'Phone', icon: Phone, color: 'bg-green-500' },
    { id: 'messages', name: 'Messages', icon: MessageSquare, color: 'bg-blue-500' },
    { id: 'chrome', name: 'Chrome', icon: Globe, color: 'bg-gradient-to-br from-yellow-400 to-orange-500' },
    { id: 'camera', name: 'Camera', icon: Camera, color: 'bg-gray-800' },
    { id: 'gallery', name: 'Gallery', icon: ImageIcon, color: 'bg-purple-500' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-600' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { id: 'maps', name: 'Maps', icon: Map, color: 'bg-green-400' },
    { id: 'music', name: 'Spotify', icon: Music, color: 'bg-green-500' },
    { id: 'settings', name: 'Settings', icon: Settings, color: 'bg-gray-600' },
    { id: 'calculator', name: 'Calc', icon: Calculator, color: 'bg-orange-500' },
    { id: 'dev_tools', name: 'DevTools', icon: Terminal, color: 'bg-black border border-green-500/50' },
];

export const VirtualMobile: React.FC<VirtualMobileProps> = ({ 
    isVisible, onClose, onOpenApp, deviceState, toggleSystemSetting, incomingCall, incomingMessage, externalActiveApp 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAppDrawerOpen, setIsAppDrawerOpen] = useState(false);

  // Sync with Jarvis Active App
  useEffect(() => {
    if (externalActiveApp) {
        const normalized = externalActiveApp.toLowerCase();
        let internalId = null;
        if (normalized.includes('whatsapp')) internalId = 'whatsapp';
        else if (normalized.includes('youtube')) internalId = 'youtube';
        else if (normalized.includes('chrome') || normalized.includes('browser')) internalId = 'chrome';
        else if (normalized.includes('settings')) internalId = 'settings';
        else if (normalized.includes('phone') || normalized.includes('call')) internalId = 'phone_internal';
        
        if (internalId) setActiveAppId(internalId);
    }
  }, [externalActiveApp]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleHome = () => {
    setActiveAppId(null);
    setIsAppDrawerOpen(false);
    setIsControlCenterOpen(false);
  };

  const handleBack = () => {
    if (activeAppId) setActiveAppId(null);
    else if (isAppDrawerOpen) setIsAppDrawerOpen(false);
    else if (isControlCenterOpen) setIsControlCenterOpen(false);
    else onClose();
  };

  const handleAppClick = (id: string) => {
      // List of apps that should trigger REAL device launch
      const realLaunchApps = ['whatsapp', 'youtube', 'maps', 'chrome', 'phone_internal', 'camera', 'spotify', 'gmail'];
      
      if (realLaunchApps.includes(id)) {
          // Map internal IDs to Jarvis command names
          const nameMap: Record<string, string> = {
              'phone_internal': 'phone',
              'chrome': 'chrome',
              'maps': 'maps',
              'camera': 'camera',
              'whatsapp': 'whatsapp',
              'youtube': 'youtube',
              'spotify': 'spotify',
              'gmail': 'gmail'
          };
          // Execute real launch on the physical device
          onOpenApp(nameMap[id] || id, 'open');
      } else {
          // Open Simulated View (Settings, Gallery, Calc)
          setActiveAppId(id);
      }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] animate-in zoom-in-95 duration-300 origin-center scale-[0.7] md:scale-90 lg:scale-100">
      
      {/* --- DEVICE FRAME (Titanium Look) --- */}
      <div className="w-[390px] h-[844px] bg-gray-900 rounded-[3.5rem] border-[6px] border-[#3a3a3a] shadow-2xl relative overflow-hidden ring-4 ring-black/50">
          
          {/* Hardware Buttons */}
          <div className="absolute top-32 -left-2 w-1 h-10 bg-[#2a2a2a] rounded-l-md" /> {/* Vol Up */}
          <div className="absolute top-44 -left-2 w-1 h-10 bg-[#2a2a2a] rounded-l-md" /> {/* Vol Down */}
          <div className="absolute top-40 -right-2 w-1 h-16 bg-[#2a2a2a] rounded-r-md" /> {/* Power */}

          {/* SCREEN */}
          <div className="w-full h-full bg-black rounded-[3.2rem] overflow-hidden relative font-sans select-none">
              
              {/* Wallpaper */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-500 ease-in-out"
                style={{ 
                    backgroundImage: 'url(https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop)',
                    filter: isControlCenterOpen ? 'blur(10px) brightness(0.5)' : 'none',
                    transform: isAppDrawerOpen ? 'scale(0.9)' : 'scale(1)'
                }}
              />

              {/* --- STATUS BAR --- */}
              <div className="absolute top-0 left-0 right-0 h-12 z-50 flex justify-between items-center px-6 pt-3 text-white font-medium text-xs">
                  <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  
                  {/* Dynamic Island / Camera Cutout */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-2 h-7 w-28 bg-black rounded-full flex items-center justify-center gap-2">
                       {/* Activity Indicator (e.g., mic usage) */}
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                       <div className="w-16 h-4 bg-gray-900 rounded-full" /> {/* Lens */}
                  </div>

                  <div className="flex gap-1.5 items-center">
                      <Signal className="w-3.5 h-3.5 fill-current" />
                      <Wifi className={`w-3.5 h-3.5 ${deviceState.wifi ? 'text-white' : 'text-gray-500'}`} />
                      <div className="flex items-center">
                          <span className="mr-0.5">{deviceState.batteryLevel}%</span>
                          <div className={`w-5 h-2.5 border border-white/40 rounded-[2px] relative flex items-center p-0.5 ${deviceState.batteryLevel && deviceState.batteryLevel < 20 ? 'border-red-500' : ''}`}>
                               <div 
                                style={{ width: `${deviceState.batteryLevel}%` }} 
                                className={`h-full rounded-[1px] ${deviceState.batteryLevel && deviceState.batteryLevel < 20 ? 'bg-red-500' : 'bg-white'}`} 
                               />
                          </div>
                      </div>
                  </div>
              </div>

              {/* --- NOTIFICATIONS / CONTROL CENTER PULL-DOWN AREA --- */}
              <div 
                className="absolute top-0 left-0 right-0 h-8 z-40 bg-transparent"
                onMouseEnter={() => {}} // Could trigger peek
              />

              {/* --- CONTROL CENTER (Quick Settings) --- */}
              <div className={`absolute inset-0 bg-black/40 backdrop-blur-xl z-[60] p-6 pt-16 transition-all duration-300 flex flex-col gap-4 ${isControlCenterOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
                   <div className="flex justify-between items-center mb-2">
                       <h2 className="text-white text-xl font-bold">Control Center</h2>
                       <button onClick={() => setIsControlCenterOpen(false)} className="p-2 bg-gray-800 rounded-full"><ChevronDown className="text-white w-5 h-5 rotate-180" /></button>
                   </div>
                   
                   {/* Toggles Grid */}
                   <div className="grid grid-cols-2 gap-4">
                       <div className="bg-gray-800/80 rounded-[1.5rem] p-4 flex flex-col gap-4">
                           <div className="grid grid-cols-2 gap-3">
                               <button 
                                onClick={() => toggleSystemSetting('wifi')} 
                                className={`aspect-square rounded-full flex items-center justify-center transition-colors ${deviceState.wifi ? 'bg-blue-500 text-white' : 'bg-gray-600/50 text-gray-300'}`}
                               >
                                   <Wifi className="w-6 h-6" />
                               </button>
                               <button 
                                onClick={() => toggleSystemSetting('bluetooth')} 
                                className={`aspect-square rounded-full flex items-center justify-center transition-colors ${deviceState.bluetooth ? 'bg-blue-500 text-white' : 'bg-gray-600/50 text-gray-300'}`}
                               >
                                   <Bluetooth className="w-6 h-6" />
                               </button>
                               <button className="aspect-square rounded-full bg-green-500 flex items-center justify-center text-white">
                                   <Signal className="w-6 h-6" />
                               </button>
                               <button className="aspect-square rounded-full bg-gray-600/50 flex items-center justify-center text-gray-300">
                                   <Globe className="w-6 h-6" />
                               </button>
                           </div>
                       </div>
                       
                       <div className="flex flex-col gap-4">
                           <div className="flex-1 bg-gray-800/80 rounded-[1.5rem] flex items-center justify-center relative overflow-hidden group">
                               <Music className="w-8 h-8 text-gray-400 group-hover:scale-110 transition-transform" />
                               <span className="absolute bottom-3 text-xs text-gray-400">Not Playing</span>
                           </div>
                           <div className="flex gap-4">
                                <button 
                                    onClick={() => toggleSystemSetting('flashlight')}
                                    className={`flex-1 aspect-square rounded-[1rem] flex items-center justify-center transition-colors ${deviceState.flashlight ? 'bg-white text-black shadow-[0_0_20px_white]' : 'bg-gray-800/80 text-white'}`}
                                >
                                    <Zap className="w-6 h-6 fill-current" />
                                </button>
                                <button className="flex-1 aspect-square rounded-[1rem] bg-gray-800/80 flex items-center justify-center text-white">
                                    <Bell className="w-6 h-6" />
                                </button>
                           </div>
                       </div>
                   </div>

                   {/* Sliders */}
                   <div className="bg-gray-800/80 rounded-[1.5rem] p-4 flex flex-col gap-4">
                       <div className="flex gap-3 items-center">
                           <Zap className="w-4 h-4 text-gray-400" />
                           <div className="flex-1 h-12 bg-gray-700/50 rounded-full relative overflow-hidden">
                                <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${deviceState.brightness}%` }} />
                           </div>
                       </div>
                       <div className="flex gap-3 items-center">
                           <Music className="w-4 h-4 text-gray-400" />
                           <div className="flex-1 h-12 bg-gray-700/50 rounded-full relative overflow-hidden">
                                <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${deviceState.volume}%` }} />
                           </div>
                       </div>
                   </div>
              </div>

              {/* --- HOME SCREEN CONTENT --- */}
              <div className={`absolute inset-0 pt-14 px-6 pb-24 flex flex-col transition-all duration-300 ${activeAppId || isAppDrawerOpen ? 'scale-95 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
                  
                  {/* Top Widget Area */}
                  <div className="flex justify-between items-start mb-8 text-white">
                      <div>
                          <h1 className="text-5xl font-light tracking-tight drop-shadow-md">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </h1>
                          <p className="text-sm opacity-90 font-medium mt-1">
                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                          </p>
                      </div>
                      <div className="flex flex-col items-center">
                           <div className="text-2xl drop-shadow-md">72°</div>
                           <div className="text-xs opacity-80">Clear</div>
                      </div>
                  </div>

                  {/* Pull Down Trigger (Invisible) */}
                  <div className="h-10 w-full" onClick={() => setIsControlCenterOpen(true)} />

                  {/* App Grid */}
                  <div className="grid grid-cols-4 gap-x-4 gap-y-6 mt-auto mb-6">
                      {ALL_APPS.slice(0, 12).map(app => (
                          <button key={app.id} onClick={() => handleAppClick(app.id)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                              <div className={`w-[60px] h-[60px] rounded-2xl ${app.color} flex items-center justify-center text-white shadow-lg`}>
                                  <app.icon className="w-7 h-7" />
                              </div>
                              <span className="text-[11px] text-white font-medium drop-shadow-md">{app.name}</span>
                          </button>
                      ))}
                  </div>

                  {/* Dock */}
                  <div className="mt-4 bg-white/20 backdrop-blur-xl rounded-[2rem] p-3 flex justify-around items-center">
                      <button onClick={() => handleAppClick('phone_internal')} className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Phone className="w-6 h-6 fill-current" /></button>
                      <button onClick={() => handleAppClick('chrome')} className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Globe className="w-6 h-6" /></button>
                      <button onClick={() => handleAppClick('messages')} className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg"><MessageSquare className="w-6 h-6 fill-current" /></button>
                      <button onClick={() => handleAppClick('camera')} className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-white shadow-lg"><Camera className="w-6 h-6" /></button>
                  </div>
              </div>

              {/* --- ACTIVE APP VIEW --- */}
              {activeAppId && (
                  <div className="absolute inset-0 z-20 bg-black animate-in slide-in-from-bottom duration-300 flex flex-col">
                      {/* App Header */}
                      <div className="pt-12 pb-2 px-4 bg-gray-900 flex items-center gap-2 border-b border-gray-800">
                           <button onClick={() => setActiveAppId(null)}><ChevronLeft className="text-white" /></button>
                           <span className="text-white font-medium capitalize">{ALL_APPS.find(a => a.id === activeAppId)?.name || 'App'}</span>
                      </div>
                      
                      {/* App Content */}
                      <div className="flex-1 bg-gray-950 text-white p-4 overflow-y-auto">
                          {activeAppId === 'settings' && (
                              <div className="space-y-4">
                                  <h2 className="text-2xl font-bold mb-4">Settings</h2>
                                  <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
                                      <div className="flex gap-3 items-center">
                                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><Wifi className="w-4 h-4"/></div>
                                          <div>Wi-Fi</div>
                                      </div>
                                      <div className="flex gap-3 items-center">
                                          <div className="text-gray-400 mr-2">{deviceState.wifi ? 'Connected' : 'Off'}</div>
                                          <button 
                                              onClick={() => toggleSystemSetting('wifi')} 
                                              className={`w-12 h-6 rounded-full p-1 transition-colors ${deviceState.wifi ? 'bg-green-500' : 'bg-gray-600'}`}
                                          >
                                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${deviceState.wifi ? 'translate-x-6' : ''}`} />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
                                      <div className="flex gap-3 items-center">
                                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"><Bluetooth className="w-4 h-4"/></div>
                                          <div>Bluetooth</div>
                                      </div>
                                      <div className="flex gap-3 items-center">
                                          <div className="text-gray-400 mr-2">{deviceState.bluetooth ? 'On' : 'Off'}</div>
                                          <button 
                                              onClick={() => toggleSystemSetting('bluetooth')} 
                                              className={`w-12 h-6 rounded-full p-1 transition-colors ${deviceState.bluetooth ? 'bg-green-500' : 'bg-gray-600'}`}
                                          >
                                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${deviceState.bluetooth ? 'translate-x-6' : ''}`} />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
                                      <div className="flex gap-3 items-center">
                                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"><Battery className="w-4 h-4"/></div>
                                          <div>Battery</div>
                                      </div>
                                      <div className="text-gray-400">{deviceState.batteryLevel}%</div>
                                  </div>
                              </div>
                          )}

                          {activeAppId === 'dev_tools' && (
                               <div className="font-mono text-xs text-green-400">
                                   <div className="mb-4 text-white font-bold text-lg">JARVIS BRIDGE STATUS</div>
                                   <div className="mb-2">BRIDGE_CONNECTED: {window.hasOwnProperty('JarvisBridge') ? 'TRUE' : 'FALSE'}</div>
                                   <div className="mb-2">DEVICE_ADMIN: SYSTEM_OVERRIDE_ACTIVE</div>
                                   <div className="mt-4 border-t border-gray-800 pt-4">
                                        <div className="text-gray-500 mb-1">MANIFEST SNIPPET:</div>
                                        <div className="bg-black p-2 rounded text-[10px] opacity-70">{MANIFEST_CODE.substring(0, 150)}...</div>
                                   </div>
                               </div>
                          )}
                          
                          {/* Generic Placeholder for others */}
                          {!['settings', 'dev_tools'].includes(activeAppId) && (
                              <div className="flex flex-col items-center justify-center h-full opacity-50">
                                  {(() => {
                                      const app = ALL_APPS.find(a => a.id === activeAppId);
                                      const Icon = app?.icon || Settings;
                                      return <Icon className="w-24 h-24 mb-4" />;
                                  })()}
                                  <p>Interface Simulated</p>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {/* --- NAVIGATION BAR --- */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-black z-[100] flex justify-center items-end pb-2">
                  {/* Gesture Pill */}
                  <div 
                    onClick={handleHome} 
                    className="w-32 h-1.5 bg-white rounded-full opacity-80 cursor-pointer active:scale-90 transition-transform" 
                  />
                  
                  {/* Back Zone (Invisible, Left Edge) */}
                  <div onClick={handleBack} className="absolute left-0 bottom-0 w-20 h-16" />
              </div>
              
          </div>
      </div>
    </div>
  );
};