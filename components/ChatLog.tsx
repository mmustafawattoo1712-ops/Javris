import React, { useEffect, useRef } from 'react';
import { Message } from '../types';

interface ChatLogProps {
  messages: Message[];
}

export const ChatLog: React.FC<ChatLogProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="absolute bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 md:max-h-[60vh] overflow-y-auto pointer-events-none p-4 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 mask-image-gradient">
      <div className="flex flex-col gap-3">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end text-right' : 'items-start text-left'}`}
          >
            <span className={`text-[10px] tracking-widest uppercase mb-0.5 ${msg.role === 'user' ? 'text-gray-400' : 'text-cyan-400'}`}>
              {msg.role === 'model' ? 'J.A.R.V.I.S.' : 'USER'}
            </span>
            <div 
              dir="auto"
              className={`text-sm md:text-base font-medium px-3 py-2 rounded-lg border backdrop-blur-md 
              ${msg.role === 'user' 
                ? 'bg-gray-800/50 border-gray-700 text-gray-200' 
                : 'bg-cyan-900/20 border-cyan-500/30 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};