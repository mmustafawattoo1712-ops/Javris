import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Message, DeviceState } from '../types';
import { base64ToUint8Array, float32ToB64PCM, pcmToAudioBuffer } from '../utils/audioUtils';
import { getBatteryStatus, getGeoLocation } from '../utils/deviceUtils';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// Tool Definitions
const tools: FunctionDeclaration[] = [
  {
    name: 'get_device_status',
    description: 'Get the current status of the mobile device including battery and charging state.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            check_reason: { type: Type.STRING, description: "Reason for checking status" }
        } 
    }
  },
  {
    name: 'get_current_location',
    description: 'Get the precise GPS coordinates of the device.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            precision: { type: Type.STRING, description: "Desired precision (high/low)" }
        } 
    }
  },
  {
    name: 'toggle_system_setting',
    description: 'Turn a system setting on or off (wifi, bluetooth, flashlight).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        setting: { type: Type.STRING, enum: ['wifi', 'bluetooth', 'flashlight'], description: 'The setting to toggle' },
        action: { type: Type.STRING, enum: ['on', 'off'], description: 'Desired state' }
      },
      required: ['setting', 'action']
    }
  },
  {
    name: 'control_installed_app',
    description: 'Execute a specific action inside an installed application (Message, Call, Play, Search, Open Settings, Set Alarm, Timer).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: { 
          type: Type.STRING, 
          enum: [
            'whatsapp', 'youtube', 'instagram', 'facebook', 'tiktok', 'twitter', 'spotify',
            'camera', 'maps', 'messages', 'browser', 'phone', 'gallery', 'gmail',
            'clock', 'calendar', 'calculator', 'notes', 'file_manager', 'play_store',
            'settings_main', 'settings_wifi', 'settings_bluetooth', 'settings_display', 
            'settings_sound', 'settings_battery', 'settings_data', 'settings_developer'
          ], 
          description: 'The target application or system menu.' 
        },
        action_type: {
            type: Type.STRING,
            enum: ['open', 'search', 'message', 'call', 'play', 'navigate', 'set_alarm', 'set_timer', 'create_note', 'create_event'],
            description: 'The type of action to perform.'
        },
        payload: {
          type: Type.STRING,
          description: 'The content (Search query, Message body, Phone number, Location, Alarm Time, Note text).'
        }
      },
      required: ['app_name', 'action_type']
    }
  },
  {
    name: 'close_application',
    description: 'Close the currently running application and return to the main Jarvis interface.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            app_name: { type: Type.STRING, description: "Name of app to close (optional)" }
        } 
    }
  },
  {
    name: 'scan_environment',
    description: 'Perform a visual or system scan of the surrounding environment.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            scan_type: { type: Type.STRING, description: "Type of scan (visual/system)" }
        } 
    }
  },
  {
    name: 'vibrate_device',
    description: 'Vibrate the device for tactile feedback.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        duration: { type: Type.NUMBER, description: 'Duration in milliseconds (default 500)' }
      }
    }
  },
  {
    name: 'go_to_home_screen',
    description: 'Minimize current windows and go to the main application grid (Home Screen).',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            animate: { type: Type.BOOLEAN, description: "Show animation" }
        } 
    }
  },
  {
    name: 'show_jarvis_interface',
    description: 'Hide the home screen and return to the main AI visualizer interface.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
             mode: { type: Type.STRING, description: "Interface mode" }
        } 
    }
  }
];

export const useJarvis = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [activeApp, setActiveApp] = useState<string | null>(null); // Track which app is currently "hacked"
  
  // Simulated Device State
  const [deviceState, setDeviceState] = useState<DeviceState>({
    batteryLevel: null,
    isCharging: false,
    wifi: true,
    bluetooth: true,
    flashlight: false,
    location: null,
    brightness: 100,
    volume: 50,
    viewMode: 'jarvis'
  });

  // Audio Contexts & Nodes
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Flashlight Track Reference (Hardware Control)
  const flashlightTrackRef = useRef<MediaStreamTrack | null>(null);
  
  // Transcription Buffers
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');

  // --- HARDWARE FLASHLIGHT CONTROL ---
  const toggleRealFlashlight = useCallback(async (turnOn: boolean) => {
      try {
          if (turnOn) {
              // If we already have a track, just ensure it's on
              if (flashlightTrackRef.current) {
                  // @ts-ignore
                  await flashlightTrackRef.current.applyConstraints({ advanced: [{ torch: true }] });
                  setDeviceState(prev => ({ ...prev, flashlight: true }));
                  return;
              }

              // Request camera with backend environment (Rear Camera)
              const stream = await navigator.mediaDevices.getUserMedia({
                  video: { facingMode: 'environment' }
              });
              
              const track = stream.getVideoTracks()[0];
              const capabilities = track.getCapabilities();

              // @ts-ignore Check if torch is supported
              if (!capabilities.torch) {
                  console.warn("Flashlight/Torch not supported on this device.");
                  track.stop();
                  setError("Mobile Flashlight not accessible.");
                  return;
              }

              flashlightTrackRef.current = track;
              // @ts-ignore
              await track.applyConstraints({ advanced: [{ torch: true }] });
              setDeviceState(prev => ({ ...prev, flashlight: true }));

          } else {
              // Turn Off
              if (flashlightTrackRef.current) {
                  // @ts-ignore
                  await flashlightTrackRef.current.applyConstraints({ advanced: [{ torch: false }] });
                  flashlightTrackRef.current.stop();
                  flashlightTrackRef.current = null;
                  setDeviceState(prev => ({ ...prev, flashlight: false }));
              }
          }
      } catch (err) {
          console.error("Flashlight Error:", err);
          setError("Flashlight access denied. Check Camera permissions.");
      }
  }, []);

  // --- CORE APP LAUNCHER LOGIC (TONY STARK EDITION) ---
  const executeAppCommand = useCallback((appName: string, actionType: string, payload: string = '') => {
      console.log(`[JARVIS PROTOCOL] Executing: App=${appName}, Action=${actionType}, Payload=${payload}`);
      
      const encodedPayload = encodeURIComponent(payload);
      let targetUrl = '';
      
      // 1. Trigger the Visual Hacking Interface first
      setActiveApp(appName);

      // *** ADVANCED INTENT LIBRARY (Optimized for Android) ***
      // We prioritize DIRECT URI SCHEMES (like whatsapp://) over intents for faster, dialer-like opening.
      switch (appName) {
          // --- SOCIAL & MEDIA ---
          case 'whatsapp':
              if (actionType === 'message' && payload) {
                   targetUrl = `whatsapp://send?text=${encodedPayload}`;
              } else {
                   targetUrl = 'whatsapp://app';
              }
              break;
          
          case 'youtube':
              if (actionType === 'search' || actionType === 'play') {
                  // Fallback to https if app not installed, but try vnd.youtube first via intent fallback logic or direct
                  targetUrl = `vnd.youtube://results?search_query=${encodedPayload}`;
              } else {
                  targetUrl = 'vnd.youtube://';
              }
              break;

          case 'instagram':
              targetUrl = 'instagram://app';
              break;
          
          case 'facebook': 
              targetUrl = 'fb://facewebmodal/f?href=https://www.facebook.com';
              break;
          
          case 'spotify': 
               targetUrl = 'spotify:'; 
               break;
          
          case 'twitter':
               targetUrl = 'twitter://';
               break;

          case 'tiktok':
               targetUrl = 'tiktok://';
               break;

          // --- COMMUNICATION ---
          case 'phone':
              if (actionType === 'call' && payload) targetUrl = `tel:${payload}`;
              else targetUrl = 'tel:';
              break;

          case 'messages':
              if (actionType === 'message' && payload) targetUrl = `sms:?body=${encodedPayload}`;
              else targetUrl = 'sms:';
              break;
          
          case 'gmail':
              if (actionType === 'message') targetUrl = `mailto:${payload}`;
              else targetUrl = 'googlegmail://';
              break;

          // --- UTILITIES (Deep Native Integration) ---
          case 'clock':
              // Clocks usually need standard Intents
              if (actionType === 'set_alarm') {
                  targetUrl = `intent://#Intent;action=android.intent.action.SET_ALARM;S.android.intent.extra.MESSAGE=${encodedPayload};end`;
              } else {
                  targetUrl = 'intent://#Intent;action=android.intent.action.SHOW_ALARMS;end';
              }
              break;
          
          case 'calendar':
              targetUrl = 'content://com.android.calendar/time/';
              break;
          
          case 'calculator': 
              targetUrl = 'intent://#Intent;category=android.intent.category.APP_CALCULATOR;end'; 
              break;
          
          case 'camera': 
              // Try to launch camera directly
              targetUrl = 'intent://#Intent;action=android.media.action.IMAGE_CAPTURE;end'; 
              break;
          
          case 'gallery': 
              targetUrl = 'content://media/internal/images/media'; 
              break;
          
          case 'maps': 
              targetUrl = `geo:0,0?q=${encodedPayload || 'current location'}`; 
              break;
          
          case 'browser': 
              targetUrl = `https://www.google.com/search?q=${encodedPayload}`; 
              break;
          
          case 'play_store': 
              targetUrl = `market://search?q=${encodedPayload || 'apps'}`; 
              break;

          // --- SYSTEM SETTINGS ---
          case 'settings_main': targetUrl = 'intent://#Intent;action=android.settings.SETTINGS;end'; break;
          case 'settings_wifi': targetUrl = 'intent://#Intent;action=android.settings.WIFI_SETTINGS;end'; break;
          case 'settings_bluetooth': targetUrl = 'intent://#Intent;action=android.settings.BLUETOOTH_SETTINGS;end'; break;
          
          default:
              targetUrl = `https://www.google.com/search?q=${appName} ${payload}`;
      }

      // Execution Layer
      if (targetUrl) {
          // Play hacking animation for 2 seconds
          setTimeout(() => {
              // For schemes like tel:, whatsapp:, geo: - simpler to just set window location
              // This acts more like a "native" redirect
              if (targetUrl.startsWith('tel:') || targetUrl.startsWith('whatsapp:') || targetUrl.startsWith('geo:') || targetUrl.startsWith('sms:') || targetUrl.startsWith('mailto:')) {
                  window.location.href = targetUrl;
              } else {
                  // For intents and web links, use the anchor tag method
                  const link = document.createElement('a');
                  link.href = targetUrl;
                  link.rel = 'noopener noreferrer';
                  
                  // Only use _blank for web URLs, Intents must open in same window to trigger app switch
                  if (!targetUrl.startsWith('intent:') && !targetUrl.startsWith('market:') && !targetUrl.startsWith('vnd.youtube')) {
                       link.target = '_blank';
                  }
                  
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
              }

              // *** CRITICAL UPDATE: Close the visual interface almost immediately ***
              setTimeout(() => {
                  setActiveApp(null);
              }, 500); 

          }, 2000); 
      }
  }, []);

  // Function to force reset the interface state
  const resetInterface = useCallback(() => {
      setActiveApp(null);
      setDeviceState(prev => ({ ...prev, viewMode: 'jarvis' }));
  }, []);

  // Initialization
  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      // Audio & Stream Setup (Standard)
      const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      inputContextRef.current = new InputContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      const OutputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      outputContextRef.current = new OutputContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      if (inputContextRef.current?.state === 'suspended') await inputContextRef.current.resume();

      if (inputContextRef.current) {
        inputAnalyserRef.current = inputContextRef.current.createAnalyser();
        inputAnalyserRef.current.fftSize = 256;
      }
      if (outputContextRef.current) {
        outputAnalyserRef.current = outputContextRef.current.createAnalyser();
        outputAnalyserRef.current.fftSize = 256;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            channelCount: 1, sampleRate: INPUT_SAMPLE_RATE,
            // Enhanced Audio Constraints for Better Listening
            echoCancellation: true, 
            autoGainControl: true, 
            noiseSuppression: true, 
            // @ts-ignore
            voiceIsolation: true 
        } 
      });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            if (!inputContextRef.current || !inputAnalyserRef.current) return;

            const source = inputContextRef.current.createMediaStreamSource(stream);
            const processor = inputContextRef.current.createScriptProcessor(2048, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const b64Data = float32ToB64PCM(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`, data: b64Data } });
              });
            };

            source.connect(inputAnalyserRef.current);
            inputAnalyserRef.current.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                console.log("Jarvis invoking tool:", fc.name, fc.args);
                let result: any = { status: 'ok' };
                
                if (fc.name === 'get_device_status') {
                  const status = await getBatteryStatus();
                  setDeviceState(prev => ({ ...prev, batteryLevel: status.level, isCharging: status.charging }));
                  result = { battery_level: status.level, is_charging: status.charging, system_integrity: 'MAXIMUM' };
                } 
                else if (fc.name === 'toggle_system_setting') {
                  const { setting, action } = fc.args as any;
                  if (setting === 'flashlight') {
                      await toggleRealFlashlight(action === 'on');
                      result = { status: 'success', message: `Jee sir, flashlight ${action} kar di hai.` };
                  } else if (['wifi', 'bluetooth'].includes(setting)) {
                      setDeviceState(prev => ({ ...prev, [setting]: action === 'on' }));
                      executeAppCommand(`settings_${setting}`, 'open');
                      result = { status: 'redirected', message: `Jee sir, ${setting} ki settings khol di hain.` };
                  }
                }
                else if (fc.name === 'control_installed_app') {
                    const { app_name, action_type, payload } = fc.args as any;
                    executeAppCommand(app_name, action_type, payload);
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
                    result = { status: 'success', message: `Jee sir, ${app_name} khol raha hoon.` };
                }
                else if (fc.name === 'close_application') {
                    // Logic to "Close" current app and show Jarvis
                    setDeviceState(prev => ({ ...prev, viewMode: 'jarvis' }));
                    setActiveApp(null); 
                    result = { status: 'success', message: 'Jee Sir, app band kar di hai, main wapis aa gaya hoon.' };
                }
                else if (fc.name === 'go_to_home_screen') {
                    setDeviceState(prev => ({ ...prev, viewMode: 'home' }));
                    setActiveApp(null);
                    result = { status: 'success', message: 'Home screen par wapis aa gaya hoon.' };
                }
                else if (fc.name === 'show_jarvis_interface') {
                    setDeviceState(prev => ({ ...prev, viewMode: 'jarvis' }));
                    setActiveApp(null);
                    result = { status: 'success' };
                }

                sessionPromise.then(session => {
                  session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } });
                });
              }
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputContextRef.current && outputAnalyserRef.current) {
              const ctx = outputContextRef.current;
              const uint8 = base64ToUint8Array(audioData);
              const audioBuffer = pcmToAudioBuffer(uint8, ctx, OUTPUT_SAMPLE_RATE);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAnalyserRef.current);
              outputAnalyserRef.current.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              source.onended = () => { sourcesRef.current.delete(source); };
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            if (msg.serverContent?.outputTranscription?.text) {
                currentOutputTranscription.current += msg.serverContent.outputTranscription.text;
            }
            if (msg.serverContent?.inputTranscription?.text) {
                currentInputTranscription.current += msg.serverContent.inputTranscription.text;
            }
            if (msg.serverContent?.turnComplete) {
                const userText = currentInputTranscription.current;
                const modelText = currentOutputTranscription.current;
                if (userText || modelText) {
                    setMessages(prev => [
                        ...prev, 
                        ...(userText ? [{ id: Date.now().toString() + 'u', role: 'user' as const, text: userText, timestamp: new Date() }] : []),
                        ...(modelText ? [{ id: Date.now().toString() + 'm', role: 'model' as const, text: modelText, timestamp: new Date() }] : [])
                    ]);
                }
                currentInputTranscription.current = '';
                currentOutputTranscription.current = '';
            }
          },
          onclose: () => setConnectionState(ConnectionState.DISCONNECTED),
          onerror: (err) => { console.error("Live API Error:", err); setConnectionState(ConnectionState.ERROR); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `
          IDENTITY:
          Tumhara naam Jarvis hai. Tum aik highly advanced, Professional AI Assistant ho.

          CRITICAL INSTRUCTIONS (MUST FOLLOW):
          1. **SPEED (Bohot Ahem):** Tumhe **DHEEMAY (Slowly)** aur **WAZEH (Clearly)** baat karni hai. Jaldi bilkul nahi karni. Har lafz thahar kar bolo.
          2. **LISTENING (Sunna):** Jab tak user apni baat poori na kar le, jawab mat do. **Wait for silence.** User ki baat katna (interrupt karna) mana hai.
          3. **TONE:** Tumhara lehja Sanjeeda (Serious), Professional, aur Polite hona chahiye. Ziyada excitement nahi dikhani.
          4. **LANGUAGE:** Khalis Urdu (Pakistan). English sirf technical words (e.g. App, Wifi, Setting) ke liye use karo.

          BEHAVIOR:
          - Jab user "App band kardo" bole, to 'close_application' tool use karo.
          - Jab user "Flashlight" bole, to 'toggle_system_setting' use karo.
          - Hamesha "Jee Sir" ya "Bilkul Sir" se baat shuru karo.
          - Agar user ki baat samajh na aaye, to aaram se dubara poocho.
          `,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          tools: [{ functionDeclarations: tools }]
        }
      });

    } catch (e) {
      console.error(e);
      setError("Failed to initialize connection.");
      setConnectionState(ConnectionState.ERROR);
    }
  }, [executeAppCommand, toggleRealFlashlight]);

  const disconnect = useCallback(() => {
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    setConnectionState(ConnectionState.DISCONNECTED);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: 'System offline.', timestamp: new Date() }]);
  }, []);

  useEffect(() => {
    let animationFrame: number;
    const updateVolume = () => {
      let maxVol = 0;
      if (inputAnalyserRef.current) {
        const data = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
        inputAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        maxVol = Math.max(maxVol, avg / 255);
      }
      if (outputAnalyserRef.current) {
        const data = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
        outputAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        maxVol = Math.max(maxVol, (avg / 255) * 1.5);
      }
      setVolume(Math.min(1, maxVol));
      animationFrame = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const setBrightness = useCallback((level: number) => {
     setDeviceState(prev => ({ ...prev, brightness: Math.max(0, Math.min(100, level)) }));
  }, []);

  const setMediaVolume = useCallback((level: number) => {
     setDeviceState(prev => ({ ...prev, volume: Math.max(0, Math.min(100, level)) }));
  }, []);

  const toggleSystemSetting = useCallback((setting: 'wifi' | 'bluetooth' | 'flashlight') => {
    if (setting === 'flashlight') {
        // Toggle the real flashlight logic using the current state to determine target state
        setDeviceState(prev => {
            const newState = !prev.flashlight;
            toggleRealFlashlight(newState);
            return { ...prev, flashlight: newState };
        });
    } else {
        setDeviceState(prev => ({ ...prev, [setting]: !prev[setting] }));
    }
  }, [toggleRealFlashlight]);

  const closeApplication = useCallback(() => {
     setDeviceState(prev => ({ ...prev, viewMode: 'home' }));
     setActiveApp(null);
  }, []);
  
  const toggleHome = useCallback(() => {
      setDeviceState(prev => {
          return { ...prev, viewMode: prev.viewMode === 'jarvis' ? 'home' : 'jarvis' };
      });
  }, []);

  const openApplication = useCallback((appName: string) => {
      executeAppCommand(appName, 'open');
  }, [executeAppCommand]);

  const closeActiveApp = useCallback(() => {
      setActiveApp(null);
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    messages,
    error,
    volume,
    deviceState,
    activeApp, 
    closeActiveApp, 
    resetInterface, // EXPORTED
    setBrightness,
    setMediaVolume,
    toggleSystemSetting,
    closeApplication,
    openApplication,
    toggleHome
  };
};