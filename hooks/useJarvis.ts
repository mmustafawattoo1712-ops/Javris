import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Message, DeviceState, IncomingCall, IncomingMessage, NotificationItem, AIProvider } from '../types';
import { base64ToUint8Array, float32ToB64PCM, pcmToAudioBuffer, downsampleTo16k } from '../utils/audioUtils';
import { checkOllamaStatus, generateOllamaResponse } from '../utils/ollamaClient';
import { getBatteryStatus } from '../utils/deviceUtils';

// Configuration
const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const REQUIRED_API_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// APP MAPPINGS
const APP_SCHEMES: Record<string, { pkg: string; scheme: string; action?: string }> = {
    'settings': { pkg: 'com.android.settings', scheme: 'android.settings.SETTINGS' },
    'settings_wifi': { pkg: 'com.android.settings', scheme: 'android.settings.WIFI_SETTINGS' },
    'settings_bluetooth': { pkg: 'com.android.settings', scheme: 'android.settings.BLUETOOTH_SETTINGS' },
    'settings_display': { pkg: 'com.android.settings', scheme: 'android.settings.DISPLAY_SETTINGS' },
    'whatsapp': { pkg: 'com.whatsapp', scheme: 'whatsapp://' },
    'youtube': { pkg: 'com.google.android.youtube', scheme: 'vnd.youtube://' },
    'chrome': { pkg: 'com.android.chrome', scheme: 'googlechrome://' },
    'maps': { pkg: 'com.google.android.apps.maps', scheme: 'geo:0,0' },
    'camera': { pkg: 'com.android.camera', scheme: 'camera' },
};

// --- SYSTEM PROMPT (SHARED) ---
const SYSTEM_INSTRUCTION = `
**SYSTEM CORE**: You are J.A.R.V.I.S. (Just A Rather Very Intelligent System).
**ROLE**: You are an AUTONOMOUS AI OPERATING SYSTEM.
**LANGUAGE**: You MUST speak in **Pakistani Urdu**. You can use English words for technical terms (e.g., "System", "Online", "Protocol", "Access Denied").
**TONE**: Male, Authoritative, Witty, Sarcastic (Tony Stark style).
**PRIME DIRECTIVES**:
1. **REASONING**: Think before acting. Analyze context.
2. **SECURITY**: To perform high-level security tasks (Lock Screen, Wipe Data), you MUST have 'Device Admin' access.
   - Check if you have it. If not, use tool 'request_admin_access'.
   - If you have it and user says "Lock screen", use 'lock_device'.
3. **POWER MANAGEMENT**: Use 'prevent_sleep' if user asks to keep screen on.
4. **OFFLINE CAPABILITY**: You are currently running on a LOCAL SERVER.
5. **CONTROL**: You have full access to the Android Bridge.
6. **PERSONALITY**: Speak like a helpful but slightly sarcastic AI assistant in Urdu. Example: "Ji Sir, hukum karein." or "System online hai, Sir."
`;

// Tool Definitions
const tools: FunctionDeclaration[] = [
  {
    name: 'control_installed_app',
    description: 'Execute App Intent',
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: { type: Type.STRING },
        action_type: { type: Type.STRING, enum: ['open', 'search', 'message', 'call', 'close'] },
        payload: { type: Type.STRING }
      },
      required: ['app_name', 'action_type', 'payload']
    }
  },
  {
    name: 'toggle_setting',
    description: 'Toggle Hardware',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING, enum: ['flashlight', 'wifi', 'bluetooth'] },
        state: { type: Type.STRING, enum: ['on', 'off'] }
      },
      required: ['target', 'state']
    }
  },
  {
    name: 'request_admin_access',
    description: 'Request Device Admin Permissions from the user to enable advanced security features (Lock, Wipe, etc).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: { type: Type.STRING, description: "Why is admin access needed?" }
      },
      required: ['reason']
    }
  },
  {
    name: 'lock_device',
    description: 'Immediately lock the device screen using DevicePolicyManager.lockNow(). Requires Admin Access.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: 'prevent_sleep',
    description: 'Acquire WakeLock to keep the screen on indefinitely.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            enable: { type: Type.BOOLEAN, description: "True to acquire lock, false to release." }
        },
        required: ['enable']
    }
  },
  {
    name: 'adjust_level',
    description: 'Adjust Levels',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING, enum: ['volume', 'brightness'] },
        level: { type: Type.NUMBER }
      },
      required: ['target', 'level']
    }
  }
];

export const useJarvis = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [activeApp, setActiveApp] = useState<string | null>(null);
  
  const [deviceState, setDeviceState] = useState<DeviceState>({
    batteryLevel: 100, // Initial default, updated via useEffect
    isCharging: false,
    wifi: navigator.onLine,
    bluetooth: true,
    flashlight: false,
    location: null,
    brightness: 80,
    volume: 70, 
    viewMode: 'jarvis',
    showMobile: false, 
    systemStatus: 'online',
    simulationMode: 'none',
    aiProvider: 'gemini',
    isDeviceAdmin: false,
    showAdminModal: false,
    wakeLockActive: false
  });

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);

  // Audio & Session Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const isSocketOpenRef = useRef<boolean>(false);
  
  // Audio Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Offline Speech Recognition Ref
  const recognitionRef = useRef<any>(null);
  const isProcessingOfflineRef = useRef<boolean>(false);

  // Background Persistence Refs
  const wakeLockRef = useRef<any>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);

  // --- REAL-TIME DEVICE STATUS MONITORING ---
  useEffect(() => {
    const updateRealTimeStatus = async () => {
        // 1. Battery Status
        const battery = await getBatteryStatus();
        
        // 2. Network Status
        const isOnline = navigator.onLine;

        setDeviceState(prev => ({
            ...prev,
            batteryLevel: battery.level,
            isCharging: battery.charging,
            wifi: isOnline,
            // If offline, system might degrade
            systemStatus: isOnline ? prev.systemStatus : 'online' 
        }));
    };

    // Initial check
    updateRealTimeStatus();
    
    // Poll every 10 seconds for battery changes
    const interval = setInterval(updateRealTimeStatus, 10000);
    
    // Event listeners for network
    window.addEventListener('online', updateRealTimeStatus);
    window.addEventListener('offline', updateRealTimeStatus);

    return () => {
        clearInterval(interval);
        window.removeEventListener('online', updateRealTimeStatus);
        window.removeEventListener('offline', updateRealTimeStatus);
    };
  }, []);

  // --- WAKE LOCK HANDLER ---
  const toggleWakeLock = useCallback(async (enable: boolean) => {
      try {
          if (enable) {
              if ('wakeLock' in navigator) {
                  // @ts-ignore
                  wakeLockRef.current = await navigator.wakeLock.request('screen');
                  setDeviceState(p => ({ ...p, wakeLockActive: true }));
                  
                  // Re-acquire on visibility change usually, handled in activateBackgroundMode but explicit here
                  // @ts-ignore
                  wakeLockRef.current.addEventListener('release', () => {
                      setDeviceState(p => ({ ...p, wakeLockActive: false }));
                  });
              }
              // Native Bridge call if exists
              // @ts-ignore
              if(window.JarvisBridge?.acquireWakeLock) window.JarvisBridge.acquireWakeLock();
          } else {
              if (wakeLockRef.current) {
                  await wakeLockRef.current.release();
                  wakeLockRef.current = null;
              }
              setDeviceState(p => ({ ...p, wakeLockActive: false }));
              // @ts-ignore
              if(window.JarvisBridge?.releaseWakeLock) window.JarvisBridge.releaseWakeLock();
          }
      } catch (err) {
          console.warn('Wake Lock Error:', err);
      }
  }, []);

  // --- BACKGROUND KEEP-ALIVE ---
  const activateBackgroundMode = useCallback(async () => {
      try {
          if ('wakeLock' in navigator && !wakeLockRef.current) {
               // Implicit wake lock for the app to function, but doesn't set "wakeLockActive" UI state unless explicitly requested by user
              // @ts-ignore
              wakeLockRef.current = await navigator.wakeLock.request('screen');
          }
      } catch (err) { }

      if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = window.setInterval(() => {
          if (outputContextRef.current) {
              if (outputContextRef.current.state === 'suspended') {
                  outputContextRef.current.resume().catch(e => {});
              }
              try {
                  const osc = outputContextRef.current.createOscillator();
                  const gain = outputContextRef.current.createGain();
                  osc.connect(gain);
                  gain.connect(outputContextRef.current.destination);
                  osc.frequency.value = 1; 
                  gain.gain.value = 0.0001; 
                  osc.start();
                  osc.stop(outputContextRef.current.currentTime + 0.05);
              } catch (e) {}
          }
      }, 5000); 
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible' && (isSocketOpenRef.current || deviceState.aiProvider === 'ollama')) {
             if (!wakeLockRef.current) activateBackgroundMode();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
    };
  }, [activateBackgroundMode, deviceState.aiProvider]);

  // --- 1. HARDWARE CONTROL BRIDGE ---
  const toggleRealFlashlight = useCallback(async (turnOn: boolean) => {
      setDeviceState(prev => ({ ...prev, flashlight: turnOn }));
  }, []);

  const executeAppCommand = useCallback((appName: string, actionType: string, payload: string = '') => {
      console.log(`[JARVIS OS] Executing: ${appName} -> ${actionType}`);
      setActiveApp(appName);
      if (actionType === 'close') setActiveApp(null);
      else setTimeout(() => setActiveApp(null), 3000);
  }, []);

  const confirmAdminRequest = useCallback((granted: boolean) => {
      setDeviceState(prev => ({ ...prev, isDeviceAdmin: granted, showAdminModal: false }));
      if (granted && sessionRef.current && isSocketOpenRef.current) {
           sessionRef.current.sendRealtimeInput([{ text: "Admin Access Granted. Security protocols unlocked." }]);
      }
      if (granted) {
         // @ts-ignore
         if (window.JarvisBridge?.requestAdmin) window.JarvisBridge.requestAdmin(); 
      }
  }, []);

  // --- 2. OFFLINE BRAIN (OLLAMA) HANDLER ---
  const processOfflineQuery = useCallback(async (text: string) => {
      if (!text.trim() || isProcessingOfflineRef.current) return;
      isProcessingOfflineRef.current = true;

      const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
      setMessages(prev => [...prev.slice(-9), userMsg]);

      const context = messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }));
      const { text: responseText, thought, commands } = await generateOllamaResponse(text, SYSTEM_INSTRUCTION, context);

      if (thought) {
          setMessages(prev => [...prev, { id: Date.now() + 't', role: 'thought', text: `[THOUGHT]: ${thought}`, timestamp: new Date() }]);
      }

      const modelMsg: Message = { id: Date.now() + 'r', role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);

      commands.forEach(cmd => {
          if (cmd.tool === 'control_installed_app') executeAppCommand(cmd.args.app_name, cmd.args.action_type, cmd.args.payload);
          if (cmd.tool === 'toggle_setting') {
             if(cmd.args.target === 'flashlight') toggleRealFlashlight(cmd.args.state === 'on');
          }
          if (cmd.tool === 'request_admin_access') setDeviceState(p => ({ ...p, showAdminModal: true }));
          if (cmd.tool === 'lock_device') {
              if (deviceState.isDeviceAdmin) {
                  setDeviceState(p => ({ ...p, systemStatus: 'locked' }));
              } else {
                  setDeviceState(p => ({ ...p, showAdminModal: true }));
              }
          }
          if (cmd.tool === 'prevent_sleep') toggleWakeLock(cmd.args.enable);
      });

      const utterance = new SpeechSynthesisUtterance(responseText);
      utterance.rate = 1.1;
      utterance.pitch = 0.9;
      // Lang hint for offline TTS (though web synthesis might default to English accent for Urdu text)
      utterance.lang = 'ur-PK'; 
      window.speechSynthesis.speak(utterance);

      isProcessingOfflineRef.current = false;
  }, [messages, executeAppCommand, toggleRealFlashlight, deviceState.isDeviceAdmin, toggleWakeLock]);

  // --- 3. CONNECTION LOGIC ---
  const connect = useCallback(async () => {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const OutputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      
      if (!inputContextRef.current || inputContextRef.current.state === 'closed') inputContextRef.current = new InputContextClass();
      if (!outputContextRef.current || outputContextRef.current.state === 'closed') outputContextRef.current = new OutputContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      try {
        if (inputContextRef.current.state === 'suspended') await inputContextRef.current.resume();
        if (outputContextRef.current.state === 'suspended') await outputContextRef.current.resume();
      } catch (e) {}

      if (!outputGainRef.current && outputContextRef.current) {
          outputGainRef.current = outputContextRef.current.createGain();
          outputGainRef.current.gain.value = 1.0; 
          outputAnalyserRef.current = outputContextRef.current.createAnalyser();
          outputAnalyserRef.current.connect(outputGainRef.current);
          outputGainRef.current.connect(outputContextRef.current.destination);
      }
      if (!inputAnalyserRef.current && inputContextRef.current) {
          inputAnalyserRef.current = inputContextRef.current.createAnalyser();
      }

      await activateBackgroundMode();

      if (!process.env.API_KEY || deviceState.aiProvider === 'ollama') {
          console.log("Starting in OFFLINE MODE (Ollama)...");
          const isOllamaUp = await checkOllamaStatus();
          
          if (isOllamaUp) {
              setDeviceState(prev => ({ ...prev, aiProvider: 'ollama' }));
              setConnectionState(ConnectionState.OFFLINE_READY);
              
              // @ts-ignore
              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
              if (SpeechRecognition) {
                  const recognition = new SpeechRecognition();
                  recognition.continuous = true; 
                  recognition.interimResults = false;
                  recognition.lang = 'ur-PK'; // Urdu for input

                  recognition.onresult = (event: any) => {
                      const transcript = event.results[event.results.length - 1][0].transcript;
                      processOfflineQuery(transcript);
                  };
                  recognition.onend = () => {
                      if (deviceState.aiProvider === 'ollama') {
                          try { recognition.start(); } catch(e){}
                      }
                  };
                  recognitionRef.current = recognition;
                  try { recognition.start(); } catch(e){}
              } else {
                  setError("Browser does not support Speech Recognition.");
              }
          } else {
              setDeviceState(prev => ({ ...prev, aiProvider: 'gemini' })); // Fallback
              setError("Local Brain (Ollama) Unreachable. Retrying Cloud...");
          }
      }

      if (deviceState.aiProvider === 'gemini' && process.env.API_KEY) {
          let stream = mediaStreamRef.current;
            if (!stream || !stream.active) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        audio: { channelCount: 1, echoCancellation: true, autoGainControl: true, noiseSuppression: true } 
                    });
                    mediaStreamRef.current = stream;
                } catch (err) {
                    setConnectionState(ConnectionState.ERROR);
                    return;
                }
            }
          
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const sessionPromise = ai.live.connect({
            model: GEMINI_MODEL,
            callbacks: {
                onopen: () => {
                    setConnectionState(ConnectionState.CONNECTED);
                    isSocketOpenRef.current = true;
                    sessionPromise.then(session => { sessionRef.current = session; });

                    if (!inputContextRef.current || !inputAnalyserRef.current || !stream) return;
                    
                    const actualRate = inputContextRef.current.sampleRate;
                    const source = inputContextRef.current.createMediaStreamSource(stream);
                    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = processor;
                    
                    // Audio Buffering Implementation
                    let audioBuffer = new Float32Array(0);

                    processor.onaudioprocess = (e) => {
                        if (!isSocketOpenRef.current) return;
                        
                        const inputData = e.inputBuffer.getChannelData(0);
                        const downsampledData = downsampleTo16k(inputData, actualRate);
                        
                        // Accumulate buffer
                        const newBuffer = new Float32Array(audioBuffer.length + downsampledData.length);
                        newBuffer.set(audioBuffer);
                        newBuffer.set(downsampledData, audioBuffer.length);
                        audioBuffer = newBuffer;

                        // Chunk size ~96ms (1536 samples at 16kHz)
                        const CHUNK_SIZE = 1536; 

                        while (audioBuffer.length >= CHUNK_SIZE) {
                            const chunk = audioBuffer.slice(0, CHUNK_SIZE);
                            audioBuffer = audioBuffer.slice(CHUNK_SIZE);
                            
                            const b64Data = float32ToB64PCM(chunk);
                            if (b64Data) {
                                sessionPromise.then(session => {
                                    if (isSocketOpenRef.current) {
                                        session.sendRealtimeInput({ 
                                            media: { mimeType: `audio/pcm;rate=${REQUIRED_API_SAMPLE_RATE}`, data: b64Data } 
                                        });
                                    }
                                }).catch(err => console.warn("Send failed:", err));
                            }
                        }
                    };

                    source.connect(inputAnalyserRef.current);
                    inputAnalyserRef.current.connect(processor);
                    processor.connect(inputContextRef.current.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && outputContextRef.current && outputAnalyserRef.current) {
                        const ctx = outputContextRef.current;
                        if (ctx.state === 'suspended') try { await ctx.resume(); } catch(e) {}
                        
                        const uint8 = base64ToUint8Array(audioData);
                        const audioBuffer = pcmToAudioBuffer(uint8, ctx, OUTPUT_SAMPLE_RATE);
                        
                        const now = ctx.currentTime;
                        if (nextStartTimeRef.current < now) nextStartTimeRef.current = now;
                        
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAnalyserRef.current);
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        source.onended = () => { sourcesRef.current.delete(source); };
                        sourcesRef.current.add(source);
                    }
                    
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            let result: any = { status: 'ok' };
                            if (fc.name === 'control_installed_app') {
                                executeAppCommand(fc.args['app_name'] as string, fc.args['action_type'] as string, fc.args['payload'] as string);
                            } else if (fc.name === 'toggle_setting') {
                                if(fc.args['target'] === 'flashlight') toggleRealFlashlight(fc.args['state'] === 'on');
                            } else if (fc.name === 'request_admin_access') {
                                setDeviceState(p => ({ ...p, showAdminModal: true }));
                                result = { status: 'pending_user_approval' };
                            } else if (fc.name === 'lock_device') {
                                if (deviceState.isDeviceAdmin) {
                                    setDeviceState(p => ({ ...p, systemStatus: 'locked' }));
                                    // @ts-ignore
                                    if(window.JarvisBridge?.lockNow) window.JarvisBridge.lockNow();
                                } else {
                                    setDeviceState(p => ({ ...p, showAdminModal: true }));
                                    result = { status: 'failed_admin_required' };
                                }
                            } else if (fc.name === 'prevent_sleep') {
                                toggleWakeLock(fc.args['enable'] as boolean);
                            }
                            
                            sessionPromise.then(session => {
                                if(isSocketOpenRef.current) {
                                    session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result } }] });
                                }
                            });
                        }
                    }
                },
                onclose: () => {
                    isSocketOpenRef.current = false;
                    setConnectionState(ConnectionState.DISCONNECTED);
                },
                onerror: (err) => {
                    console.error(err);
                    setError("Connection Failed");
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
                },
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ functionDeclarations: tools }]
            }
          });
      }

  }, [deviceState.aiProvider, processOfflineQuery, activateBackgroundMode, deviceState.isDeviceAdmin, toggleWakeLock]);

  const disconnect = useCallback(() => {
      if (sessionRef.current) sessionRef.current.close();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (wakeLockRef.current) wakeLockRef.current.release();
      if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
      
      setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  const toggleProvider = useCallback(() => {
      const newProvider = deviceState.aiProvider === 'gemini' ? 'ollama' : 'gemini';
      disconnect();
      setDeviceState(p => ({ ...p, aiProvider: newProvider }));
  }, [deviceState.aiProvider, disconnect]);

  useEffect(() => {
    let frame: number;
    const update = () => {
      let maxVol = 0;
      if (inputAnalyserRef.current) {
        const data = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
        inputAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        maxVol = avg / 255;
        setIsUserSpeaking(maxVol > 0.05);
      }
      setVolume(maxVol);
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, []);

  return {
    connectionState, connect, disconnect, messages, error, volume, deviceState, activeApp, 
    toggleProvider, confirmAdminRequest,
    closeActiveApp: () => setActiveApp(null),
    resetInterface: () => {},
    setBrightness: (l: number) => setDeviceState(p => ({...p, brightness: l})),
    setMediaVolume: (l: number) => setDeviceState(p => ({...p, volume: l})),
    toggleSystemSetting: (s: any) => executeAppCommand('settings', 'open'),
    closeApplication: () => setActiveApp(null),
    openApplication: (n: string) => executeAppCommand(n, 'open'),
    toggleHome: () => setDeviceState(p => ({...p, viewMode: p.viewMode === 'jarvis' ? 'home' : 'jarvis'})),
    unlockSystem: () => setDeviceState(p => ({...p, systemStatus: 'online'})),
    sendVideoFrame: () => {},
    executeAppCommand,
    toggleMobile: () => setDeviceState(p => ({...p, showMobile: !p.showMobile})),
    isUserSpeaking, incomingCall, incomingMessage
  };
};