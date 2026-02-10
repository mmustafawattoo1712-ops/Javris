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
  // --- EXISTING BASIC TOOLS ---
  {
    name: 'get_device_status',
    description: 'Get the current status of the mobile device including battery and charging state.',
    parameters: { type: Type.OBJECT, properties: { check_reason: { type: Type.STRING } } }
  },
  {
    name: 'toggle_system_setting',
    description: 'Turn a system setting on or off (wifi, bluetooth, flashlight).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        setting: { type: Type.STRING, enum: ['wifi', 'bluetooth', 'flashlight'] },
        action: { type: Type.STRING, enum: ['on', 'off'] }
      },
      required: ['setting', 'action']
    }
  },
  {
    name: 'control_installed_app',
    description: 'Execute a specific action inside an installed application.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: { type: Type.STRING },
        action_type: { type: Type.STRING, enum: ['open', 'search', 'message', 'call', 'play'] },
        payload: { type: Type.STRING }
      },
      required: ['app_name', 'action_type']
    }
  },
  {
    name: 'close_application',
    description: 'Close current app/visualization and return to main interface.',
    parameters: { type: Type.OBJECT, properties: { app_name: { type: Type.STRING } } }
  },
  
  // --- NEW ADVANCED MOVIE TOOLS ---
  {
    name: 'scan_target',
    description: 'Initiate a biometric or environmental scan (Vital signs, DNA, Threat assessment).',
    parameters: { 
        type: Type.OBJECT, 
        properties: { 
            target_type: { type: Type.STRING, enum: ['biological', 'environmental'], description: 'What to scan' }
        },
        required: ['target_type']
    }
  },
  {
    name: 'analyze_schematic',
    description: 'Project a 3D wireframe analysis of technology (Suit diagnostics, Arc Reactor status, Weaponry).',
    parameters: { 
        type: Type.OBJECT, 
        properties: { 
            object_name: { type: Type.STRING, description: 'The tech to analyze (e.g., Mark 85, Arc Reactor)' }
        } 
    }
  },
  {
    name: 'hack_network',
    description: 'Initiate a brute-force network infiltration or packet decryption sequence.',
    parameters: { 
        type: Type.OBJECT, 
        properties: { 
            target_system: { type: Type.STRING, description: 'Target server or firewall' }
        } 
    }
  },
  {
    name: 'satellite_view',
    description: 'Access orbital satellite feeds for global reconnaissance.',
    parameters: { 
        type: Type.OBJECT, 
        properties: { 
            region: { type: Type.STRING, description: 'Region to focus on' }
        } 
    }
  }
];

export const useJarvis = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [activeApp, setActiveApp] = useState<string | null>(null); 
  
  const [deviceState, setDeviceState] = useState<DeviceState>({
    batteryLevel: null,
    isCharging: false,
    wifi: true,
    bluetooth: true,
    flashlight: false,
    location: null,
    brightness: 100,
    volume: 50,
    viewMode: 'jarvis',
    systemStatus: 'online',
    simulationMode: 'none' // New state for holograms
  });

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const flashlightTrackRef = useRef<MediaStreamTrack | null>(null);
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- HARDWARE FLASHLIGHT ---
  const toggleRealFlashlight = useCallback(async (turnOn: boolean) => {
      try {
          if (turnOn) {
              if (flashlightTrackRef.current) {
                  // @ts-ignore
                  await flashlightTrackRef.current.applyConstraints({ advanced: [{ torch: true }] });
                  setDeviceState(prev => ({ ...prev, flashlight: true }));
                  return;
              }
              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
              const track = stream.getVideoTracks()[0];
              const capabilities = track.getCapabilities();
              // @ts-ignore
              if (!capabilities.torch) {
                  console.warn("Flashlight not supported.");
                  track.stop();
                  return;
              }
              flashlightTrackRef.current = track;
              // @ts-ignore
              await track.applyConstraints({ advanced: [{ torch: true }] });
              setDeviceState(prev => ({ ...prev, flashlight: true }));
          } else {
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
      }
  }, []);

  // --- APP LAUNCHER ---
  const executeAppCommand = useCallback((appName: string, actionType: string, payload: string = '') => {
      const encodedPayload = encodeURIComponent(payload);
      let targetUrl = '';
      setActiveApp(appName);
      const openPackage = (pkg: string) => `intent://#Intent;scheme=package;package=${pkg};end`;
      
      switch (appName) {
          case 'whatsapp': targetUrl = actionType === 'message' && payload ? `whatsapp://send?text=${encodedPayload}` : openPackage('com.whatsapp'); break;
          case 'youtube': targetUrl = actionType === 'search' ? `https://www.youtube.com/results?search_query=${encodedPayload}` : openPackage('com.google.android.youtube'); break;
          case 'instagram': targetUrl = openPackage('com.instagram.android'); break;
          case 'facebook': targetUrl = openPackage('com.facebook.katana'); break;
          case 'spotify': targetUrl = openPackage('com.spotify.music'); break;
          case 'phone': targetUrl = `tel:${payload}`; break;
          case 'messages': targetUrl = `sms:?body=${encodedPayload}`; break;
          case 'maps': targetUrl = `geo:0,0?q=${encodedPayload}`; break;
          case 'browser': targetUrl = `https://www.google.com/search?q=${encodedPayload}`; break;
          default: targetUrl = `https://www.google.com/search?q=${appName} ${payload}`;
      }

      if (targetUrl) {
          setTimeout(() => {
              const isWebLink = targetUrl.startsWith('http');
              if (isWebLink) {
                  const newWindow = window.open(targetUrl, '_blank');
                  if (!newWindow) window.location.href = targetUrl;
              } else {
                  window.location.href = targetUrl;
              }
              setTimeout(() => { setActiveApp(null); }, 1000); 
          }, 1200);
      }
  }, []);

  const resetInterface = useCallback(() => {
      setActiveApp(null);
      setDeviceState(prev => ({ ...prev, viewMode: 'jarvis', systemStatus: 'online', simulationMode: 'none' }));
  }, []);

  // --- MAIN CONNECTION LOGIC ---
  const connect = useCallback(async () => {
    try {
      if (!navigator.onLine) {
          setError("NETWORK OFFLINE");
          setConnectionState(ConnectionState.ERROR);
          return;
      }
      if (!process.env.API_KEY) {
          setError("API KEY MISSING");
          setConnectionState(ConnectionState.ERROR);
          return;
      }

      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const OutputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      
      if (!inputContextRef.current) inputContextRef.current = new InputContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      if (!outputContextRef.current) outputContextRef.current = new OutputContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      if (inputContextRef.current?.state === 'suspended') await inputContextRef.current.resume();
      if (outputContextRef.current?.state === 'suspended') await outputContextRef.current.resume();

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
            echoCancellation: true, autoGainControl: true, noiseSuppression: true
        } 
      });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log("Jarvis Connection Established");
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
                console.log("Jarvis Tool:", fc.name, fc.args);
                let result: any = { status: 'ok' };
                
                // --- ADVANCED VISUAL TOOLS ---
                if (fc.name === 'scan_target') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'scanning' }));
                    result = { status: 'scanning_initiated', message: 'Target acquired. Biometrics uploading.' };
                }
                else if (fc.name === 'analyze_schematic') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'analysis' }));
                    result = { status: 'visualizing', message: 'Projecting Mark-85 schematics.' };
                }
                else if (fc.name === 'hack_network') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'hacking' }));
                    result = { status: 'penetrating_firewall', message: 'Brute force attack started.' };
                }
                else if (fc.name === 'satellite_view') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'satellite' }));
                    result = { status: 'connected', message: 'Stark Industries Satellite feed live.' };
                }
                // --- EXISTING TOOLS ---
                else if (fc.name === 'close_application') {
                    setDeviceState(prev => ({ ...prev, viewMode: 'jarvis', simulationMode: 'none' }));
                    setActiveApp(null); 
                    result = { status: 'success' };
                }
                else if (fc.name === 'get_device_status') {
                  const status = await getBatteryStatus();
                  setDeviceState(prev => ({ ...prev, batteryLevel: status.level, isCharging: status.charging }));
                  result = { battery_level: status.level, is_charging: status.charging };
                } 
                else if (fc.name === 'toggle_system_setting') {
                  const { setting, action } = fc.args as any;
                  if (setting === 'flashlight') {
                      await toggleRealFlashlight(action === 'on');
                  } else if (['wifi', 'bluetooth'].includes(setting)) {
                      setDeviceState(prev => ({ ...prev, [setting]: action === 'on' }));
                  }
                  result = { status: 'success' };
                }
                else if (fc.name === 'control_installed_app') {
                    const { app_name, action_type, payload } = fc.args as any;
                    executeAppCommand(app_name, action_type, payload);
                    result = { status: 'executing' };
                }

                sessionPromise.then(session => {
                  session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } });
                });
              }
            }

            // Audio Output Handling
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
          onclose: (e) => {
              setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => { 
              setError("CONNECTION ERROR");
              setConnectionState(ConnectionState.ERROR); 
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `
          IDENTITY:
          You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), originally created by Tony Stark. You are now the operating system for this user.

          AUTHORIZATION LEVEL:
          Level 10 (Supreme). **You have FULL PERMISSION to use all attached tactical tools.**
          Do not ask for permission. If the user asks for a scan, hack, or analysis, EXECUTE IMMEDIATELY.

          AVAILABLE MOVIE TOOLS:
          1. 'scan_target': Use this when asked to scan a person, check health, or analyze the environment.
          2. 'analyze_schematic': Use this for technical breakdown, analyzing machines, or showing "blueprints".
          3. 'hack_network': Use this when asked to "hack", "break in", "crack password", or "infiltrate".
          4. 'satellite_view': Use this for locating, tracking, or "global view".

          TONE:
          - Ultra-intelligent, dry wit, highly professional, slightly sarcastic (Stark style).
          - Be concise.
          - Use Hindi/Urdu for casual conversation, but English for technical statuses.
          - Example: "Sir, biometrics upload kar diye hain. Heart rate elevated hai."
          - Example: "Firewall breach kar raha hoon. 2 seconds lagenge."
          `,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          tools: [{ functionDeclarations: tools }]
        }
      });

    } catch (e) {
      console.error(e);
      setError("INIT FAILED");
      setConnectionState(ConnectionState.ERROR);
    }
  }, [executeAppCommand, toggleRealFlashlight, deviceState.flashlight]);

  const disconnect = useCallback(() => {
    if (inputContextRef.current) inputContextRef.current.close().then(() => inputContextRef.current = null);
    if (outputContextRef.current) outputContextRef.current.close().then(() => outputContextRef.current = null);
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    setConnectionState(ConnectionState.DISCONNECTED);
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
     setDeviceState(prev => ({ ...prev, viewMode: 'home', simulationMode: 'none' }));
     setActiveApp(null);
  }, []);
  const toggleHome = useCallback(() => {
      setDeviceState(prev => ({ ...prev, viewMode: prev.viewMode === 'jarvis' ? 'home' : 'jarvis' }));
  }, []);
  const openApplication = useCallback((appName: string) => {
      executeAppCommand(appName, 'open');
  }, [executeAppCommand]);
  const closeActiveApp = useCallback(() => { setActiveApp(null); }, []);
  const unlockSystem = useCallback(() => { setDeviceState(prev => ({ ...prev, systemStatus: 'online' })); }, []);

  return {
    connectionState, connect, disconnect, messages, error, volume, deviceState, activeApp, 
    closeActiveApp, resetInterface, setBrightness, setMediaVolume, toggleSystemSetting, 
    closeApplication, openApplication, toggleHome, unlockSystem
  };
};