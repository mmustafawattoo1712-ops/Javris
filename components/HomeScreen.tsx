import React from 'react';
import { Camera, Map, MessageSquare, Settings, Globe, Phone, Music, Mail, Calendar, Calculator, Clock } from 'lucide-react';

interface HomeScreenProps {
  onOpenApp: (appName: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenApp }) => {
  const apps = [
    { name: 'camera', icon: Camera, gradient: 'from-gray-700 to-gray-900', iconColor: 'text-gray-300' },
    { name: 'maps', icon: Map, gradient: 'from-green-500 to-emerald-700', iconColor: 'text-white' },
    { name: 'messages', icon: MessageSquare, gradient: 'from-green-400 to-green-600', iconColor: 'text-white' },
    { name: 'settings', icon: Settings, gradient: 'from-gray-500 to-gray-700', iconColor: 'text-white' },
    { name: 'browser', icon: Globe, gradient: 'from-blue-400 to-blue-600', iconColor: 'text-white' },
    { name: 'mail', icon: Mail, gradient: 'from-cyan-400 to-blue-500', iconColor: 'text-white' },
    { name: 'calendar', icon: Calendar, gradient: 'from-white to-gray-200', iconColor: 'text-red-500' },
    { name: 'calculator', icon: Calculator, gradient: 'from-orange-400 to-orange-600', iconColor: 'text-white' },
    { name: 'clock', icon: Clock, gradient: 'from-gray-900 to-black', iconColor: 'text-white' },
  ];

  const dockApps = [
      { name: 'phone', icon: Phone, gradient: 'from-green-400 to-green-600' },
      { name: 'browser', icon: Globe, gradient: 'from-blue-400 to-blue-600' },
      { name: 'messages', icon: MessageSquare, gradient: 'from-green-400 to-emerald-600' },
      { name: 'music', icon: Music, gradient: 'from-red-500 to-pink-600' },
  ];

  return (
    <div className="absolute inset-0 z-20 pt-24 px-6 pb-32 overflow-y-auto overflow-x-hidden no-scrollbar">
      
      {/* 3D Date Widget */}
      <div className="text-center mb-12 perspective-1000">
          <div className="transform transition-transform hover:scale-105 duration-500">
            <h2 className="text-6xl font-thin text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h2>
            <p className="text-sm text-cyan-200/80 uppercase tracking-[0.3em] mt-2 font-medium">
                {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-4 gap-x-5 gap-y-10 max-w-md mx-auto perspective-1000">
        {apps.map((app, i) => (
          <button
            key={app.name}
            onClick={() => onOpenApp(app.name)}
            className="flex flex-col items-center gap-3 group relative transition-all duration-300 hover:-translate-y-2"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* 3D Icon Container */}
            <div className={`
                w-16 h-16 rounded-[1.2rem] flex items-center justify-center 
                bg-gradient-to-br ${app.gradient}
                shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_5px_rgba(0,0,0,0.2)]
                border-t border-white/20
                transition-all duration-200 
                group-active:scale-95 group-active:shadow-none
                relative overflow-hidden
            `}>
                {/* Glossy Shine */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                
                <app.icon className={`w-8 h-8 ${app.iconColor} drop-shadow-md relative z-10`} />
            </div>
            
            <span className="text-[10px] font-medium text-white/80 capitalize tracking-wide drop-shadow-md font-sans group-hover:text-white transition-colors">
              {app.name}
            </span>
          </button>
        ))}
      </div>
      
      {/* Floating 3D Dock */}
      <div className="absolute bottom-8 left-4 right-4 mx-auto max-w-sm">
        <div className="
            h-24 bg-white/5 backdrop-blur-xl rounded-[2.5rem] 
            flex items-center justify-around px-2 
            border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]
            transform transition-all hover:scale-[1.02] duration-500
        ">
            {dockApps.map((app) => (
                <button 
                    key={app.name}
                    onClick={() => onOpenApp(app.name)} 
                    className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center 
                        bg-gradient-to-br ${app.gradient}
                        shadow-[0_8px_15px_-3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]
                        border-t border-white/20
                        active:scale-90 active:shadow-inner transition-all duration-200
                        group relative
                    `}
                >
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl" />
                    <app.icon className="w-7 h-7 text-white drop-shadow-md relative z-10" />
                    
                    {/* Reflection dot */}
                    <div className="absolute bottom-2 w-1 h-1 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};