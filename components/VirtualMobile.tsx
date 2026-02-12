import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, MessageSquare, Camera, Image as ImageIcon, Settings, Globe, Play, Youtube, Wifi, Battery, 
  ChevronLeft, GripHorizontal, Search, User, Map, Mail, Music, Video, Calendar, Clock, Calculator, 
  Files, Shield, Zap, ShoppingBag, Send, Menu, Home, Square, ArrowUp, PhoneIncoming, PhoneOff, Mic, UserCheck, 
  Terminal, ShieldCheck, X
} from 'lucide-react';
import { IncomingCall, IncomingMessage } from '../types';
import { DeviceAdminModal } from './DeviceAdminModal';
import { 
    MANIFEST_CODE, 
    JAVA_CLASS_CODE, 
    POLICY_XML_CODE, 
    LOCK_FUNCTION_CODE, 
    BIOMETRIC_JAVA_CODE, 
    WAKELOCK_JAVA_CODE,
    ACCESSIBILITY_SERVICE_CODE,
    MEDIA_CONTROL_CODE,
    PIPELINE_CODE 
} from '../utils/androidSnippets';

interface VirtualMobileProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenApp: (appName: string, actionType: string, payload?: string) => void;
  batteryLevel: number | null;
  incomingCall?: IncomingCall | null; 
  incomingMessage?: IncomingMessage | null;
  showAdminModal?: boolean;
  onConfirmAdmin?: (granted: boolean) => void;
}

const ALL_APPS = [
    { id: 'phone_internal', name: 'Phone', icon: Phone, color: 'bg-green-500' },
    { id: 'contacts', name: 'Contacts', icon: User, color: 'bg-blue-600' },
    { id: 'messages', name: 'Messages', icon: MessageSquare, color: 'bg-blue-500' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-600' },
    { id: 'clock', name: 'World Clock', icon: Clock, color: 'bg-gray-900 border border-gray-700' },
    { id: 'chrome', name: 'Chrome', icon: Globe, color: 'bg-yellow-500' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { id: 'camera', name: 'Camera', icon: Camera, color: 'bg-gray-800' },
    { id: 'settings', name: 'Settings', icon: Settings, color: 'bg-gray-600' },
    { id: 'dev_tools', name: 'Dev Tools', icon: Terminal, color: 'bg-black border border-green-500/50' },
];

const TIME_ZONES = [
    { city: 'Karachi', zone: 'Asia/Karachi', country: 'PK' },
    { city: 'New York', zone: 'America/New_York', country: 'US' },
    { city: 'London', zone: 'Europe/London', country: 'UK' },
    { city: 'Dubai', zone: 'Asia/Dubai', country: 'AE' },
    { city: 'Tokyo', zone: 'Asia/Tokyo', country: 'JP' },
    { city: 'Sydney', zone: 'Australia/Sydney', country: 'AU' },
    { city: 'Moscow', zone: 'Europe/Moscow', country: 'RU' },
    { city: 'Paris', zone: 'Europe/Paris', country: 'FR' },
];

export const VirtualMobile: React.FC<VirtualMobileProps> = ({ 
    isVisible, onClose, onOpenApp, batteryLevel, incomingCall, incomingMessage, showAdminModal, onConfirmAdmin 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialerOpen, setDialerOpen] = useState(false);
  const [clockAppOpen, setClockAppOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState("");
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAppClick = (appId: string) => {
    if (appId === 'phone_internal') {
        setDialerOpen(true);
        setIsDrawerOpen(false);
    } else if (appId === 'clock') {
        setClockAppOpen(true);
        setIsDrawerOpen(false);
    } else if (appId === 'dev_tools') {
        setLaunchingApp(appId);
        setTimeout(() => {
            setActiveAppId('dev_tools');
            setLaunchingApp(null);
            setIsDrawerOpen(false);
        }, 500);
    } else {
        if (navigator.vibrate) navigator.vibrate(50);
        setLaunchingApp(appId);
        setTimeout(() => {
            onOpenApp(appId, 'open');
            setLaunchingApp(null);
        }, 800);
    }
  };

  const handleHome = () => {
      setActiveAppId(null);
      setDialerOpen(false);
      setClockAppOpen(false);
      setIsDrawerOpen(false);
  };

  const handleBack = () => {
      if (activeAppId) setActiveAppId(null);
      else if (dialerOpen) setDialerOpen(false);
      else if (clockAppOpen) setClockAppOpen(false);
      else if (isDrawerOpen) setIsDrawerOpen(false);
      else onClose(); 
  };

  const filteredApps = ALL_APPS.filter(app => 
      app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] animate-in zoom-in-95 duration-300 lg:scale-100 md:scale-90 scale-[0.65] origin-center">
      
      <div className="w-[430px] h-[900px] bg-black rounded-[4.5rem] border-[12px] border-gray-900 shadow-2xl relative overflow-hidden ring-4 ring-cyan-500/20">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-52 h-10 bg-black rounded-b-[2rem] z-50 flex justify-center items-center gap-5">
              <div className="w-24 h-2 bg-gray-800 rounded-full" />
              <div className="w-3.5 h-3.5 bg-gray-900 rounded-full border border-gray-800 bg-blue-900/50" />
          </div>

          <div className="w-full h-full bg-cover bg-center relative flex flex-col" 
               style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop)' }}>
              
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />

              {/* ADMIN MODAL OVERLAY */}
              {showAdminModal && onConfirmAdmin && (
                  <DeviceAdminModal 
                      onConfirm={() => onConfirmAdmin(true)} 
                      onCancel={() => onConfirmAdmin(false)} 
                  />
              )}

              {/* WORLD CLOCK APP */}
              {clockAppOpen && (
                  <div className="absolute inset-0 bg-black z-40 pt-12 flex flex-col text-white font-sans animate-in slide-in-from-bottom duration-300">
                      <div className="px-6 mb-4 flex justify-between items-center">
                          <h2 className="text-3xl font-light">World Clock</h2>
                          <button onClick={() => setClockAppOpen(false)}><X className="text-gray-400" /></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto px-4 pb-20 no-scrollbar space-y-4">
                          {/* Main Local Time */}
                          <div className="p-4 bg-gray-900 rounded-2xl border border-gray-800 mb-6">
                              <div className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-1">Local Time</div>
                              <div className="flex justify-between items-end">
                                  <div className="text-4xl font-light">
                                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="text-sm text-gray-400">{currentTime.toLocaleDateString()}</div>
                              </div>
                          </div>

                          {/* Zones */}
                          {TIME_ZONES.map((zone) => {
                              const timeString = new Date().toLocaleTimeString('en-US', { timeZone: zone.zone, hour: '2-digit', minute: '2-digit' });
                              const dateString = new Date().toLocaleDateString('en-US', { timeZone: zone.zone, weekday: 'short', month: 'short', day: 'numeric' });
                              const isDay = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: zone.zone, hour12: false, hour: '2-digit' })) > 6 && parseInt(new Date().toLocaleTimeString('en-US', { timeZone: zone.zone, hour12: false, hour: '2-digit' })) < 18;

                              return (
                                  <div key={zone.city} className="flex justify-between items-center p-4 border-b border-gray-800/50">
                                      <div>
                                          <div className="text-lg font-medium text-gray-200">{zone.city}</div>
                                          <div className="text-xs text-gray-500">{dateString}</div>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-2xl font-light tracking-wide">{timeString}</div>
                                          <div className="text-[10px] text-gray-600 font-mono">{isDay ? 'DAY' : 'NIGHT'}</div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {/* DEV TOOLS APP (SHOWING NATIVE CODE) */}
              {activeAppId === 'dev_tools' && (
                  <div className="absolute inset-0 bg-gray-900 z-40 pt-12 text-green-400 font-mono text-xs overflow-y-auto px-4 pb-20">
                      <div className="text-center text-lg font-bold mb-4 text-white">NATIVE BRIDGE CODES</div>
                      
                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">1. Manifest Declaration</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{MANIFEST_CODE}</div>
                      </div>

                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">2. Policy XML (res/xml/)</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{POLICY_XML_CODE}</div>
                      </div>

                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">3. JarvisAdminReceiver.java</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{JAVA_CLASS_CODE}</div>
                      </div>

                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">4. Lock Device Function</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{LOCK_FUNCTION_CODE}</div>
                      </div>
                      
                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">5. Biometric Unlock</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{BIOMETRIC_JAVA_CODE}</div>
                      </div>

                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">6. Keep Screen On (WakeLock)</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{WAKELOCK_JAVA_CODE}</div>
                      </div>

                      {/* NEW PIPELINE SECTIONS */}
                      <div className="mb-6 pt-4 border-t border-gray-700">
                          <div className="text-center text-white font-bold mb-4">AUTOMATION PIPELINE</div>
                      </div>

                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">7. Accessibility Service (UI Tap/Scroll)</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{ACCESSIBILITY_SERVICE_CODE}</div>
                      </div>

                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">8. Media Control (Play/Pause)</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{MEDIA_CONTROL_CODE}</div>
                      </div>

                      <div className="mb-6">
                          <div className="text-gray-400 mb-1 font-bold">9. Jarvis Pipeline (The Brain)</div>
                          <div className="bg-black p-2 rounded border border-gray-700 whitespace-pre-wrap select-all">{PIPELINE_CODE}</div>
                      </div>

                      <div className="text-center text-gray-500 italic mt-8">Copy these snippets into your Android Studio Project to enable native Device Admin control.</div>
                  </div>
              )}

              {/* ... (Existing Launching Overlay & Status Bar) ... */}
              {launchingApp && (
                  <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
                      <div className="mb-10">
                          {(() => {
                              const app = ALL_APPS.find(a => a.id === launchingApp);
                              const Icon = app?.icon || Settings;
                              return (
                                <div className={`w-28 h-28 rounded-[2rem] ${app?.color || 'bg-gray-500'} flex items-center justify-center shadow-2xl animate-bounce`}>
                                     <Icon className="w-14 h-14 text-white" />
                                </div>
                              );
                          })()}
                      </div>
                  </div>
              )}

               <div className="absolute top-3 left-0 right-0 px-10 flex justify-between items-center text-white text-xs font-medium z-40">
                  <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <div className="flex gap-2 items-center">
                      <Wifi className="w-4 h-4" />
                      <div className="flex items-center gap-1">
                          <span className="text-[10px]">{batteryLevel || 100}%</span>
                          <Battery className="w-4 h-4" />
                      </div>
                  </div>
              </div>

              {/* HOME SCREEN */}
              <div className={`flex-1 flex flex-col relative transition-all duration-300 ${isDrawerOpen || dialerOpen || activeAppId || clockAppOpen ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
                  <div className="mt-24 mx-8">
                      <div className="text-6xl text-white font-thin drop-shadow-md">
                          {currentTime.getHours()}:{currentTime.getMinutes().toString().padStart(2, '0')}
                      </div>
                      <div className="text-lg text-white/90 drop-shadow-md mt-1">
                          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                  </div>

                  <div className="mx-6 mt-10 bg-white/90 rounded-full h-12 flex items-center px-6 gap-4 shadow-lg">
                      <div className="font-bold text-2xl"><span className="text-blue-500">G</span><span className="text-red-500">o</span><span className="text-yellow-500">o</span><span className="text-blue-500">g</span><span className="text-green-500">l</span><span className="text-red-500">e</span></div>
                      <span className="text-gray-400 text-sm">Search...</span>
                  </div>

                  <div className="mt-auto mb-6 px-6 grid grid-cols-4 gap-6">
                      {ALL_APPS.slice(0, 8).map(app => (
                          <button key={app.id} onClick={() => handleAppClick(app.id)} className="flex flex-col items-center gap-2">
                              <div className={`w-14 h-14 rounded-3xl ${app.color} flex items-center justify-center shadow-lg text-white`}>
                                  <app.icon className="w-7 h-7" />
                              </div>
                              <span className="text-xs text-white drop-shadow-md truncate w-full text-center font-medium">{app.name}</span>
                          </button>
                      ))}
                  </div>

                  <div className="mx-4 mb-4 p-4 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex justify-between items-center px-8">
                       <button onClick={() => handleAppClick('phone_internal')} className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                           <Phone className="w-7 h-7 text-white fill-white" />
                       </button>
                       <button onClick={() => handleAppClick('messages')} className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center">
                           <MessageSquare className="w-7 h-7 text-white fill-white" />
                       </button>
                       <button onClick={() => handleAppClick('chrome')} className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center">
                           <Globe className="w-7 h-7 text-white" />
                       </button>
                       <button onClick={() => handleAppClick('dev_tools')} className="w-14 h-14 rounded-full bg-black border border-green-500/50 flex items-center justify-center">
                           <Terminal className="w-7 h-7 text-green-500" />
                       </button>
                  </div>

                  <button onClick={() => setIsDrawerOpen(true)} className="absolute bottom-28 left-0 right-0 h-10 flex flex-col items-center justify-center text-white/50 animate-bounce">
                      <ArrowUp className="w-5 h-5" />
                  </button>
              </div>

              {/* APP DRAWER */}
              <div className={`absolute inset-0 bg-black/80 backdrop-blur-xl z-20 flex flex-col pt-16 transition-all duration-300 ${isDrawerOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                  <div className="px-6 mb-6">
                      <div className="bg-gray-800 rounded-full h-12 flex items-center px-6 gap-3 text-white/70">
                          <Search className="w-5 h-5" />
                          <input 
                            type="text" 
                            placeholder="Search apps..." 
                            className="bg-transparent border-none outline-none text-base w-full text-white placeholder:text-gray-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
                      <div className="grid grid-cols-4 gap-y-8 gap-x-4">
                          {filteredApps.map(app => (
                              <button key={app.id} onClick={() => handleAppClick(app.id)} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
                                  <div className={`w-14 h-14 rounded-[1.2rem] ${app.color} flex items-center justify-center shadow-md text-white`}>
                                      <app.icon className="w-7 h-7" />
                                  </div>
                                  <span className="text-xs text-gray-200 text-center leading-tight font-medium">{app.name}</span>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              {/* DIALER */}
              {dialerOpen && (
                  <div className="absolute inset-0 bg-gray-900 z-30 flex flex-col pt-16">
                      <div className="px-8 mb-10 mt-10">
                          <div className="text-5xl text-white font-light text-center h-16 tracking-wider">{dialNumber}</div>
                          {dialNumber === "" && <div className="text-gray-500 text-center text-base h-16 pt-2">Enter number</div>}
                      </div>
                      <div className="grid grid-cols-3 gap-8 px-12 mb-10">
                          {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => (
                              <button 
                                key={n} 
                                onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); setDialNumber(p => p + n.toString()); }}
                                className="w-20 h-20 rounded-full bg-gray-800 text-white text-3xl font-medium flex items-center justify-center active:bg-gray-700 hover:bg-gray-750 transition-colors"
                              >
                                  {n}
                              </button>
                          ))}
                      </div>
                      <div className="flex justify-center mt-auto mb-24 gap-10 items-center">
                          <button onClick={() => setDialNumber(p => p.slice(0, -1))} className="w-16 h-16 flex items-center justify-center text-gray-400">
                              <ChevronLeft className="w-8 h-8" />
                          </button>
                          <button 
                             onClick={() => { if(dialNumber) onOpenApp('phone', 'call', dialNumber); }}
                             className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg active:scale-95 hover:bg-green-400 transition-colors"
                          >
                              <Phone className="w-10 h-10 text-white fill-white" />
                          </button>
                          <div className="w-16" />
                      </div>
                  </div>
              )}

              {/* SYSTEM NAV */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/20 backdrop-blur-sm z-50 flex justify-around items-center px-12 pb-4">
                  <button onClick={handleBack} className="p-6 active:bg-white/10 rounded-full">
                      <ChevronLeft className="w-6 h-6 text-white/80" />
                  </button>
                  <button onClick={handleHome} className="p-6 active:bg-white/10 rounded-full">
                      <Home className="w-6 h-6 text-white/80" />
                  </button>
                  <button className="p-6 active:bg-white/10 rounded-full">
                      <Square className="w-5 h-5 text-white/80 fill-current opacity-50" />
                  </button>
              </div>

          </div>
      </div>
    </div>
  );
};