import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, MessageSquare, Camera, Image as ImageIcon, Settings, Globe, Play, Youtube, Wifi, Battery, 
  ChevronLeft, GripHorizontal, Search, User, Map, Mail, Music, Video, Calendar, Clock, Calculator, 
  Files, Shield, Zap, ShoppingBag, Send, Menu, Home, Square, ArrowUp, PhoneIncoming, PhoneOff, Mic, UserCheck
} from 'lucide-react';
import { IncomingCall, IncomingMessage } from '../types';

interface VirtualMobileProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenApp: (appName: string, actionType: string, payload?: string) => void;
  batteryLevel: number | null;
  incomingCall?: IncomingCall | null; // New Prop
  incomingMessage?: IncomingMessage | null; // New Prop
}

// App Data Structure
const ALL_APPS = [
    // Communication
    { id: 'phone_internal', name: 'Phone', icon: Phone, color: 'bg-green-500' },
    { id: 'contacts', name: 'Contacts', icon: User, color: 'bg-blue-600' },
    { id: 'messages', name: 'Messages', icon: MessageSquare, color: 'bg-blue-500' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-600' },
    { id: 'messenger', name: 'Messenger', icon: MessageSquare, color: 'bg-blue-400' },
    { id: 'telegram', name: 'Telegram', icon: Send, color: 'bg-sky-500' },
    
    // Social
    { id: 'facebook', name: 'Facebook', icon: Globe, color: 'bg-blue-700' },
    { id: 'instagram', name: 'Instagram', icon: Camera, color: 'bg-pink-600' },
    { id: 'tiktok', name: 'TikTok', icon: Music, color: 'bg-black' },
    { id: 'twitter', name: 'X', icon: Globe, color: 'bg-black' },
    { id: 'snapchat', name: 'Snapchat', icon: Zap, color: 'bg-yellow-400' },

    // Google / Utilities
    { id: 'chrome', name: 'Chrome', icon: Globe, color: 'bg-yellow-500' },
    { id: 'gmail', name: 'Gmail', icon: Mail, color: 'bg-red-500' },
    { id: 'maps', name: 'Maps', icon: Map, color: 'bg-green-600' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { id: 'gallery', name: 'Photos', icon: ImageIcon, color: 'bg-yellow-500' },
    { id: 'camera', name: 'Camera', icon: Camera, color: 'bg-gray-800' },
    { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-blue-500' },
    { id: 'clock', name: 'Clock', icon: Clock, color: 'bg-gray-900' },
    { id: 'calculator', name: 'Calculator', icon: Calculator, color: 'bg-orange-500' },
    { id: 'file_manager', name: 'Files', icon: Files, color: 'bg-blue-400' },

    // System
    { id: 'settings', name: 'Settings', icon: Settings, color: 'bg-gray-600' },
    { id: 'settings_wifi', name: 'WiFi', icon: Wifi, color: 'bg-blue-600' },
    
    // Financial (Pakistani Context)
    { id: 'easypaisa', name: 'Easypaisa', icon:  Wifi, color: 'bg-green-700' },
    { id: 'jazzcash', name: 'JazzCash', icon:  Zap, color: 'bg-red-700' },
    { id: 'sadapay', name: 'SadaPay', icon: ShoppingBag, color: 'bg-teal-500' },

    // Games
    { id: 'pubg', name: 'PUBG', icon: Play, color: 'bg-yellow-700' },
    { id: 'freefire', name: 'FreeFire', icon: Zap, color: 'bg-orange-600' },
    { id: 'spotify', name: 'Spotify', icon: Music, color: 'bg-green-500' },
];

export const VirtualMobile: React.FC<VirtualMobileProps> = ({ isVisible, onClose, onOpenApp, batteryLevel, incomingCall, incomingMessage }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialerOpen, setDialerOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState("");
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);

  // Time Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAppClick = (appId: string) => {
    if (appId === 'phone_internal') {
        setDialerOpen(true);
        setIsDrawerOpen(false);
    } else {
        // Visual Haptic & Launch
        if (navigator.vibrate) navigator.vibrate(50);
        setLaunchingApp(appId);
        
        // Launch real intent after animation
        setTimeout(() => {
            onOpenApp(appId, 'open');
            setLaunchingApp(null);
        }, 800);
    }
  };

  const handleHome = () => {
      if (dialerOpen) setDialerOpen(false);
      else if (isDrawerOpen) setIsDrawerOpen(false);
      else {
          // Already at home, maybe trigger haptic
      }
  };

  const handleBack = () => {
      if (dialerOpen) setDialerOpen(false);
      else if (isDrawerOpen) setIsDrawerOpen(false);
      else onClose(); // Close phone if back pressed on home
  };

  const filteredApps = ALL_APPS.filter(app => 
      app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] animate-in zoom-in-95 duration-300 lg:scale-100 md:scale-90 scale-[0.65] origin-center">
      
      {/* PHONE FRAME - INCREASED SIZE (Pro Max Dimensions) */}
      <div className="w-[430px] h-[900px] bg-black rounded-[4.5rem] border-[12px] border-gray-900 shadow-2xl relative overflow-hidden ring-4 ring-cyan-500/20">
          
          {/* BEZEL & NOTCH */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-52 h-10 bg-black rounded-b-[2rem] z-50 flex justify-center items-center gap-5">
              <div className="w-24 h-2 bg-gray-800 rounded-full" />
              <div className="w-3.5 h-3.5 bg-gray-900 rounded-full border border-gray-800 bg-blue-900/50" />
          </div>

          {/* SCREEN CONTENT CONTAINER */}
          <div className="w-full h-full bg-cover bg-center relative flex flex-col" 
               style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop)' }}>
              
              {/* Wallpaper Dimmer */}
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />

              {/* --- INCOMING CALL OVERLAY --- */}
              {incomingCall && (
                  <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center pt-24 pb-12 animate-in slide-in-from-bottom duration-500">
                      
                      {incomingCall.status === 'connected' ? (
                          <>
                            <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center mb-8 border-4 border-green-500 animate-pulse">
                                <UserCheck className="w-16 h-16 text-white" />
                            </div>
                            <h2 className="text-3xl font-thin text-white mb-2">{incomingCall.name}</h2>
                            <p className="text-green-400 mb-20 animate-pulse">00:04</p>
                            
                            <div className="mt-auto grid grid-cols-3 gap-8 px-12 w-full">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center"><Mic className="w-6 h-6 text-white" /></div>
                                    <span className="text-xs text-white">Mute</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center"><User className="w-6 h-6 text-white" /></div>
                                    <span className="text-xs text-white">Contacts</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg"><PhoneOff className="w-8 h-8 text-white" /></div>
                                    <span className="text-xs text-white">End</span>
                                </div>
                            </div>
                          </>
                      ) : (
                          <>
                            <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center mb-8 border-4 border-gray-700 animate-bounce">
                                <User className="w-16 h-16 text-gray-400" />
                            </div>
                            <h2 className="text-3xl font-thin text-white mb-2">{incomingCall.name}</h2>
                            <p className="text-gray-400 mb-20">Incoming call...</p>
                            
                            <div className="mt-auto flex justify-between w-full px-12">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg animate-pulse">
                                        <PhoneOff className="w-8 h-8 text-white fill-white" />
                                    </div>
                                    <span className="text-white text-sm">Decline</span>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-[bounce_1s_infinite]">
                                        <PhoneIncoming className="w-8 h-8 text-white fill-white" />
                                    </div>
                                    <span className="text-white text-sm">Accept</span>
                                </div>
                            </div>
                          </>
                      )}
                  </div>
              )}

              {/* --- NOTIFICATION BANNER --- */}
              {incomingMessage && (
                  <div className="absolute top-14 left-4 right-4 bg-gray-200/90 backdrop-blur-md rounded-2xl p-4 shadow-xl z-[90] animate-in slide-in-from-top duration-500 flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                              <h4 className="font-bold text-gray-900 text-sm">{incomingMessage.sender}</h4>
                              <span className="text-xs text-gray-500">now</span>
                          </div>
                          <p className="text-gray-700 text-sm truncate">{incomingMessage.content}</p>
                      </div>
                  </div>
              )}


              {/* LAUNCHING OVERLAY (Transition) */}
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
                      <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
              )}

              {/* STATUS BAR */}
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

              {/* === VIEW: HOME SCREEN === */}
              <div className={`flex-1 flex flex-col relative transition-all duration-300 ${isDrawerOpen || dialerOpen ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
                  
                  {/* TIME WIDGET */}
                  <div className="mt-24 mx-8">
                      <div className="text-6xl text-white font-thin drop-shadow-md">
                          {currentTime.getHours()}:{currentTime.getMinutes().toString().padStart(2, '0')}
                      </div>
                      <div className="text-lg text-white/90 drop-shadow-md mt-1">
                          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                  </div>

                  {/* GOOGLE SEARCH BAR WIDGET */}
                  <div className="mx-6 mt-10 bg-white/90 rounded-full h-12 flex items-center px-6 gap-4 shadow-lg">
                      <div className="font-bold text-2xl"><span className="text-blue-500">G</span><span className="text-red-500">o</span><span className="text-yellow-500">o</span><span className="text-blue-500">g</span><span className="text-green-500">l</span><span className="text-red-500">e</span></div>
                      <span className="text-gray-400 text-sm">Search...</span>
                  </div>

                  {/* FAVORITES GRID */}
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

                  {/* DOCK */}
                  <div className="mx-4 mb-4 p-4 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex justify-between items-center px-8">
                       <button onClick={() => handleAppClick('phone_internal')} className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                           <Phone className="w-7 h-7 text-white fill-white" />
                       </button>
                       <button onClick={() => handleAppClick('messages')} className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                           <MessageSquare className="w-7 h-7 text-white fill-white" />
                       </button>
                       <button onClick={() => handleAppClick('chrome')} className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                           <Globe className="w-7 h-7 text-white" />
                       </button>
                       <button onClick={() => handleAppClick('camera')} className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                           <Camera className="w-7 h-7 text-white" />
                       </button>
                  </div>

                  {/* SWIPE UP INDICATOR */}
                  <button onClick={() => setIsDrawerOpen(true)} className="absolute bottom-28 left-0 right-0 h-10 flex flex-col items-center justify-center text-white/50 animate-bounce">
                      <ArrowUp className="w-5 h-5" />
                  </button>
              </div>

              {/* === VIEW: APP DRAWER === */}
              <div className={`absolute inset-0 bg-black/80 backdrop-blur-xl z-20 flex flex-col pt-16 transition-all duration-300 ${isDrawerOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                  
                  {/* Search Apps */}
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

                  {/* App Grid */}
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

              {/* === VIEW: DIALER === */}
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
                                onClick={() => { 
                                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                        navigator.vibrate(10);
                                    }
                                    setDialNumber(p => p + n.toString()); 
                                }}
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
                          <div className="w-16" /> {/* Spacer */}
                      </div>
                  </div>
              )}

              {/* === SYSTEM NAVIGATION BAR === */}
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