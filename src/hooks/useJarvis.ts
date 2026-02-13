
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
const SECURITY_PIN = "1122"; 

// SYSTEM PROMPT
const SYSTEM_INSTRUCTION = `
**SYSTEM CORE**: You are J.A.R.V.I.S. (Mobile Operating System Interface).
**ROLE**: Advanced Android Assistant.
**LANGUAGE**: **Urdu (Roman/Native mix) & English**.
**CAPABILITIES**:
1. **WHATSAPP**: "Ali ko message karo" -> Use 'send_whatsapp_message'.
2. **CALLING**: "Ali ko call milao" -> Use 'make_phone_call'.
3. **READING**: "Kya koi message aaya hai?" -> Use 'read_last_notification'.
4. **APPS**: Control any app.
5. **SECURITY**: Lock/Unlock device.
`;

const tools: FunctionDeclaration[] = [
  {
    name: 'control_installed_app',
    description: 'Launch applications',
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: { type: Type.STRING },
        action_type: { type: Type.STRING },
        payload: { type: Type.STRING }
      },
      required: ['app_name', 'action_type', 'payload']
    }
  },
  {
    name: 'send_whatsapp_message',
    description: 'Send a WhatsApp message to a specific contact',
    parameters: {
      type: Type.OBJECT,
      properties: {
        contact_name: { type: Type.STRING, description: "Name of the person (e.g. Ali, Mom)" },
        message_body: { type: Type.STRING, description: "Content of the message" }
      },
      required: ['contact_name', 'message_body']
    }
  },
  {
    name: 'make_phone_call',
    description: 'Make a phone call to a contact',
    parameters: {
      type: Type.OBJECT,
      properties: {
        contact_name: { type: Type.STRING, description: "Name of the person to call" }
      },
      required: ['contact_name']
    }
  },
  {
    name: 'read_last_notification',
    description: 'Read the last received notification (WhatsApp/SMS)',
    parameters: {
      type: Type.OBJECT,
      properties: { check: { type: Type.BOOLEAN } },
      required: ['check']
    }
  },
  {
    name: 'control_media',
    description: 'Control media playback',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING }
      },
      required: ['command']
    }
  },
  {
    name: 'toggle_setting',
    description: 'Toggle hardware features',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { type: Type.STRING },
        state: { type: Type.STRING }
      },
      required: ['target', 'state']
    }
  },
  {
    name: 'lock_device',
    description: 'Lock screen',
    parameters: {
      type: Type.OBJECT,
      properties: { confirm: { type: Type.BOOLEAN } },
      required: ['confirm']
    }
  },
  {
    name: 'unlock_device',
    description: 'Unlock screen',
    parameters: {
      type: Type.OBJECT,
      properties: { pin_code: { type: Type.STRING } },
      required: ['pin_code']
    }
  }
];

// APP PACKAGES
const APP_PACKAGES: Record<string, string> = {
    whatsapp: 'com.whatsapp',
    youtube: 'com.google.android.youtube',
    facebook: 'com.facebook.katana',
    tiktok: 'com.zhiliaoapp.musically',
    pubg: 'com.tencent.ig',
    settings: 'com.android.settings',
    camera: 'com.android.camera',
    chrome: 'com.android.chrome',
    phone: 'com.google.android.dialer',
    maps: 'com.google.android.apps.maps'
};

export const useJarvis = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);
  
  const [deviceState, setDeviceState] = useState<DeviceState>({
    batteryLevel: 100, isCharging: false, wifi: true, bluetooth: true, flashlight: false,
    location: null, brightness: 80, volume: 70, viewMode: 'jarvis', showMobile: false, 
    systemStatus: 'locked',
    simulationMode: 'none', aiProvider: 'gemini', wakeLockActive: false
  });

  const sessionRef = useRef<any>(null);
  const isSocketOpenRef = useRef<boolean>(false);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const executeAppCommand = useCallback((appName: string, actionType: string, payload: string = '') => {
      const cleanName = appName.toLowerCase().replace(/\s/g, '');
      const packageName = APP_PACKAGES[cleanName] || cleanName;
      if (actionType === 'close') {
          setActiveApp(null); 
          if (window.JarvisBridge) window.JarvisBridge.performAction('HOME'); 
          return; 
      }
      setActiveApp(appName); 
      if (window.JarvisBridge) window.JarvisBridge.launchApp(packageName, actionType, payload);
  }, []);

  const toggleSystemSetting = useCallback((setting: string, state?: boolean) => {
      setDeviceState(prev => {
          const newState = state !== undefined ? state : !prev[setting as keyof DeviceState];
          if (window.JarvisBridge) window.JarvisBridge.toggleSystemSetting(setting, newState);
          return { ...prev, [setting]: newState };
      });
  }, []);
  
  const sendVideoFrame = useCallback((base64Data: string) => {
      if (sessionRef.current && isSocketOpenRef.current) {
          try {
              sessionRef.current.sendRealtimeInput({
                  media: { mimeType: 'image/jpeg', data: base64Data }
              });
          } catch(e) {}
      }
  }, []);

  const unlockSystem = useCallback(() => {
      setDeviceState(prev => ({ ...prev, systemStatus: 'online' }));
  }, []);

  const connect = useCallback(async () => {
      setConnectionState(ConnectionState.CONNECTING);
      try {
           if(window.JarvisBridge) window.JarvisBridge.acquireWakeLock();
          
           const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
           const OutputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
           inputContextRef.current = new InputContextClass();
           if (inputContextRef.current!.state === 'suspended') await inputContextRef.current!.resume();
           outputContextRef.current = new OutputContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

           const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
           });
           mediaStreamRef.current = stream;

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const sessionPromise = ai.live.connect({
                model: GEMINI_MODEL,
                callbacks: {
                    onopen: () => {
                        setConnectionState(ConnectionState.CONNECTED);
                        isSocketOpenRef.current = true;
                        sessionPromise.then(session => sessionRef.current = session);
                        
                        const source = inputContextRef.current!.createMediaStreamSource(stream);
                        const processor = inputContextRef.current!.createScriptProcessor(4096, 1, 1);
                        const analyser = inputContextRef.current!.createAnalyser();
                        analyser.fftSize = 256;
                        source.connect(analyser);
                        const dataArray = new Uint8Array(analyser.frequencyBinCount);

                        processor.onaudioprocess = (e) => {
                             analyser.getByteFrequencyData(dataArray);
                             const vol = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                             setVolume(vol / 255);
                             setIsUserSpeaking(vol > 10);

                             const inputData = e.inputBuffer.getChannelData(0);
                             const downsampled = downsampleTo16k(inputData, inputContextRef.current!.sampleRate);
                             const b64Data = float32ToB64PCM(downsampled);
                             if (isSocketOpenRef.current && b64Data) {
                                 sessionPromise.then(session => session.sendRealtimeInput({ 
                                     media: { mimeType: `audio/pcm;rate=${REQUIRED_API_SAMPLE_RATE}`, data: b64Data } 
                                 }));
                             }
                        };
                        analyser.connect(processor);
                        processor.connect(inputContextRef.current!.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData) {
                            const uint8 = base64ToUint8Array(audioData);
                            const audioBuffer = pcmToAudioBuffer(uint8, outputContextRef.current!, OUTPUT_SAMPLE_RATE);
                            const source = outputContextRef.current!.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputContextRef.current!.destination);
                            const now = outputContextRef.current!.currentTime;
                            const startTime = Math.max(nextStartTimeRef.current, now);
                            source.start(startTime);
                            nextStartTimeRef.current = startTime + audioBuffer.duration;
                        }

                        if (msg.toolCall) {
                            for (const fc of msg.toolCall.functionCalls) {
                                let result = { status: 'ok', info: '' };
                                
                                if (fc.name === 'control_installed_app') {
                                    executeAppCommand(fc.args['app_name'] as string, fc.args['action_type'] as string, fc.args['payload'] as string);
                                } else if (fc.name === 'send_whatsapp_message') {
                                    if(window.JarvisBridge) window.JarvisBridge.sendWhatsAppMessage(fc.args['contact_name'] as string, fc.args['message_body'] as string);
                                    result.info = "Message sent.";
                                } else if (fc.name === 'make_phone_call') {
                                    if(window.JarvisBridge) window.JarvisBridge.makePhoneCall(fc.args['contact_name'] as string);
                                    result.info = "Calling now.";
                                } else if (fc.name === 'read_last_notification') {
                                    const notif = window.JarvisBridge ? window.JarvisBridge.getLatestNotification() : "No Access";
                                    result.info = notif;
                                } else if (fc.name === 'toggle_setting') {
                                    toggleSystemSetting(fc.args['target'] as string, fc.args['state'] === 'on');
                                } else if (fc.name === 'lock_device') {
                                    if(window.JarvisBridge) window.JarvisBridge.lockNow();
                                } else if (fc.name === 'unlock_device') {
                                    if (fc.args['pin_code'] === SECURITY_PIN) {
                                        if(window.JarvisBridge) window.JarvisBridge.unlockDevice();
                                        unlockSystem();
                                        result = { status: 'unlocked', info: '' };
                                    } else {
                                        result = { status: 'denied', info: 'Wrong PIN' };
                                    }
                                }
                                
                                sessionPromise.then(s => s.sendToolResponse({ 
                                    functionResponses: [{ id: fc.id, name: fc.name, response: { result } }] 
                                }));
                            }
                        }
                    },
                    onclose: () => setConnectionState(ConnectionState.DISCONNECTED),
                    onerror: () => setConnectionState(ConnectionState.ERROR)
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                    systemInstruction: SYSTEM_INSTRUCTION,
                    tools: [{ functionDeclarations: tools }]
                }
          });
      } catch (err) {
          setConnectionState(ConnectionState.ERROR);
      }
  }, [executeAppCommand, toggleSystemSetting, unlockSystem]);

  const disconnect = useCallback(() => {
     if(sessionRef.current) try { sessionRef.current.close(); } catch(e){}
     isSocketOpenRef.current = false;
     setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  return { 
      connectionState, connect, disconnect, messages, volume, error, deviceState, activeApp,
      toggleSystemSetting, unlockSystem, sendVideoFrame, executeAppCommand, isUserSpeaking, 
      incomingCall, incomingMessage,
      closeActiveApp: () => setActiveApp(null),
      resetInterface: () => setMessages([]),
      setBrightness: (v: number) => setDeviceState(p => ({...p, brightness: v})),
      setMediaVolume: (v: number) => setDeviceState(p => ({...p, volume: v})),
      toggleProvider: () => {},
      closeApplication: () => setActiveApp(null),
      openApplication: (app: string) => setActiveApp(app),
      toggleHome: () => setDeviceState(p => ({...p, viewMode: p.viewMode === 'jarvis' ? 'home' : 'jarvis'})),
      toggleMobile: () => setDeviceState(p => ({...p, showMobile: !p.showMobile}))
  };
};
