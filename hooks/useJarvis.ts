import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Message, DeviceState } from '../types';
import { base64ToUint8Array, float32ToB64PCM, pcmToAudioBuffer } from '../utils/audioUtils';
import { getBatteryStatus, getGeoLocation } from '../utils/deviceUtils';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// --- ADVANCED APP MAPPING (PAKISTANI/GLOBAL CONTEXT) ---
const APP_SCHEMES: Record<string, { pkg: string; scheme?: string }> = {
    // Social
    'whatsapp': { pkg: 'com.whatsapp', scheme: 'whatsapp://' },
    'business': { pkg: 'com.whatsapp.w4b', scheme: 'whatsapp-business://' },
    'facebook': { pkg: 'com.facebook.katana', scheme: 'fb://' },
    'messenger': { pkg: 'com.facebook.orca', scheme: 'fb-messenger://' },
    'instagram': { pkg: 'com.instagram.android', scheme: 'instagram://' },
    'tiktok': { pkg: 'com.zhiliaoapp.musically', scheme: 'snssdk1233://' },
    'snapchat': { pkg: 'com.snapchat.android', scheme: 'snapchat://' },
    'twitter': { pkg: 'com.twitter.android', scheme: 'twitter://' },
    'x': { pkg: 'com.twitter.android', scheme: 'twitter://' },
    'linkedin': { pkg: 'com.linkedin.android', scheme: 'linkedin://' },
    'telegram': { pkg: 'org.telegram.messenger', scheme: 'tg://' },
    'discord': { pkg: 'com.discord', scheme: 'discord://' },
    
    // Entertainment
    'youtube': { pkg: 'com.google.android.youtube', scheme: 'vnd.youtube://' },
    'netflix': { pkg: 'com.netflix.mediaclient', scheme: 'nflx://' },
    'spotify': { pkg: 'com.spotify.music', scheme: 'spotify://' },
    'prime': { pkg: 'com.amazon.avod.thirdpartyclient', scheme: 'primevideo://' },
    
    // Games
    'pubg': { pkg: 'com.tencent.ig', scheme: 'pubgmobile://' },
    'freefire': { pkg: 'com.dts.freefireth', scheme: '' },
    'cod': { pkg: 'com.activision.callofduty.shooter', scheme: 'callofduty://' },
    'subway': { pkg: 'com.kiloo.subwaysurf', scheme: '' },
    'ludo': { pkg: 'com.ludo.king', scheme: '' },

    // System / Utility
    'camera': { pkg: '', scheme: 'intent://#Intent;action=android.media.action.IMAGE_CAPTURE;end' },
    'gallery': { pkg: 'com.google.android.apps.photos', scheme: 'content://media/internal/images/media' },
    'photos': { pkg: 'com.google.android.apps.photos', scheme: '' },
    'files': { pkg: 'com.google.android.documentsui', scheme: 'content://downloads/all_downloads' },
    'calculator': { pkg: 'com.google.android.calculator', scheme: '' },
    'clock': { pkg: 'com.google.android.deskclock', scheme: '' },
    'calendar': { pkg: 'com.google.android.calendar', scheme: 'content://com.android.calendar/time/' },
    'settings': { pkg: 'com.android.settings', scheme: 'intent://#Intent;action=android.settings.SETTINGS;end' },
    'wifi': { pkg: '', scheme: 'intent://#Intent;action=android.settings.WIFI_SETTINGS;end' },
    'bluetooth': { pkg: '', scheme: 'intent://#Intent;action=android.settings.BLUETOOTH_SETTINGS;end' },
    'maps': { pkg: 'com.google.android.apps.maps', scheme: 'geo:0,0' },
    'gmail': { pkg: 'com.google.android.gm', scheme: 'googlegmail://' },
    'email': { pkg: '', scheme: 'mailto:' },
    'phone': { pkg: '', scheme: 'tel:' },
    'sms': { pkg: '', scheme: 'sms:' },
    'contacts': { pkg: 'com.google.android.contacts', scheme: 'content://contacts/people/' },
    
    // Banking (Pakistani)
    'easypaisa': { pkg: 'pk.com.telenor.phoenix', scheme: '' },
    'jazzcash': { pkg: 'com.techlogix.mobilinkcustomer', scheme: '' },
    'sadapay': { pkg: 'io.sadapay.wallet', scheme: '' },
    'nayapay': { pkg: 'com.nayapay.app', scheme: '' },
};

// Tool Definitions
const tools: FunctionDeclaration[] = [
  // --- SYSTEM TOOLS ---
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
    name: 'control_power',
    description: 'Control the device power state (Shutdown, Lock Screen, Reboot).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ['shutdown', 'lock', 'reboot'], description: 'Power action to perform' }
      },
      required: ['action']
    }
  },
  {
    name: 'control_installed_app',
    description: 'Execute a specific action inside an installed application. Use this for WhatsApp, YouTube, Instagram, PUBG, Camera, etc.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: { 
          type: Type.STRING, 
          description: 'The name of the app to control (e.g., whatsapp, pubg, camera, easypaisa).' 
        },
        action_type: {
            type: Type.STRING,
            enum: ['open', 'search', 'message', 'call', 'play', 'navigate', 'set_alarm'],
            description: 'The type of action to perform.'
        },
        payload: {
          type: Type.STRING,
          description: 'The content (Search query, Message body, Phone number).'
        }
      },
      required: ['app_name', 'action_type']
    }
  },
  {
    name: 'close_application',
    description: 'Close the currently running application/visualizer and return to the main Jarvis interface.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            app_name: { type: Type.STRING, description: "Name of app to close (optional)" }
        } 
    }
  },
  
  // --- MOVIE / ADVANCED VISUALS ---
  {
    name: 'scan_target',
    description: 'Initiate a biometric or environmental scan (Medical, Threat, Structural).',
    parameters: { 
        type: Type.OBJECT, 
        properties: { target_type: { type: Type.STRING } } 
    }
  },
  {
    name: 'hack_network',
    description: 'Initiate a network infiltration sequence (Brute force, Firewall breach).',
    parameters: { 
        type: Type.OBJECT, 
        properties: { target_system: { type: Type.STRING } } 
    }
  },
  {
    name: 'check_suit_status',
    description: 'Run full diagnostics on the Iron Man armor (Mark 85). Check integrity, power, ammo, nanites.',
    parameters: { 
        type: Type.OBJECT, 
        properties: { system: { type: Type.STRING, description: "Specific system to check (optional)" } } 
    }
  },
  {
    name: 'house_party_protocol',
    description: 'Activate automated sentry mode, deploy Iron Legion, or engage combat protocols.',
    parameters: { 
        type: Type.OBJECT, 
        properties: { target: { type: Type.STRING, description: "Target to engage (optional)" } } 
    }
  },
  {
    name: 'synthesize_element',
    description: 'Model and synthesize a new chemical element (Badassium/Vibranium) atomically.',
    parameters: { 
        type: Type.OBJECT, 
        properties: { element_name: { type: Type.STRING } } 
    }
  },
  {
    name: 'calculate_flight_path',
    description: 'Calculate supersonic flight trajectory to a destination or orbital insertion.',
    parameters: { 
        type: Type.OBJECT, 
        properties: { destination: { type: Type.STRING } } 
    }
  },
  {
    name: 'search_shield_database',
    description: 'Access classified S.H.I.E.L.D., Hydra, or Global Intelligence databases.',
    parameters: { 
        type: Type.OBJECT, 
        properties: { query: { type: Type.STRING } } 
    }
  },
  {
    name: 'satellite_view',
    description: 'Access orbital satellite feeds for global reconnaissance.',
    parameters: { 
        type: Type.OBJECT, 
        properties: { region: { type: Type.STRING } } 
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
    simulationMode: 'none'
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
  const isIntentionalDisconnect = useRef<boolean>(false);
  const connectRef = useRef<() => Promise<void>>(null);

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

  const executeAppCommand = useCallback((appName: string, actionType: string, payload: string = '') => {
      console.log(`[JARVIS] App: ${appName}, Action: ${actionType}`);
      const encodedPayload = encodeURIComponent(payload);
      let targetUrl = '';
      
      setActiveApp(appName);
      
      // Normalized app name matching
      const key = appName.toLowerCase().replace(/\s/g, '');
      const appData = APP_SCHEMES[key];
      
      // Helper for Intent construction (Android)
      // This format forcefully tells Android to find the package, otherwise fallback to Play Store (S.browser_fallback_url)
      const buildIntent = (pkg: string, scheme: string = '', fallback: string = '') => {
          if (scheme && scheme.startsWith('intent:')) return scheme; // Already formatted
          
          // If we have a scheme (like whatsapp://), try that first.
          // The 'package' parameter ensures it doesn't open in a browser.
          if (scheme) {
              return `intent://${scheme.replace('://', '')}#Intent;scheme=${scheme.split(':')[0]};package=${pkg};end`;
          }
          
          // Pure package launch
          return `intent://#Intent;scheme=package;package=${pkg};end`;
      };

      if (appData) {
          // 1. KNOWN APPS FROM DICTIONARY
          
          // Special handling for specific actions within known apps
          if (key === 'whatsapp' && actionType === 'message') {
              targetUrl = `intent://send?text=${encodedPayload}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
          } 
          else if (key === 'youtube' && actionType === 'search') {
               targetUrl = `https://www.youtube.com/results?search_query=${encodedPayload}`; // YouTube handles web links well via app links
          }
          else if (key === 'maps') {
               targetUrl = `geo:0,0?q=${encodedPayload}`;
          }
          else if (key === 'phone' || key === 'call') {
               targetUrl = `tel:${payload}`;
          }
          else if (key === 'sms' || key === 'message') {
               targetUrl = `sms:?body=${encodedPayload}`;
          }
          else {
              // Standard App Launch
              targetUrl = buildIntent(appData.pkg, appData.scheme);
          }

      } else {
          // 2. UNKNOWN APPS - FALLBACK GUESSING
          // Try to guess the package name or use a Google Search fallback
          if (actionType === 'open') {
               // Try a generic launch attempt using common naming conventions (risky but better than just search)
               // e.g. "open angry birds" -> try to find a package? Hard to guess.
               // Better to fallback to Google Play search or Google Search.
               targetUrl = `https://play.google.com/store/search?q=${encodedPayload}&c=apps`;
          } else {
              targetUrl = `https://www.google.com/search?q=${appName} ${payload}`;
          }
      }

      console.log(`[JARVIS] Computed Target URL: ${targetUrl}`);

      if (targetUrl) {
          setTimeout(() => {
              // Force window location change. This is the most effective way to trigger intents on Mobile Chrome.
              window.location.href = targetUrl;
              
              // Reset UI after a delay
              setTimeout(() => { setActiveApp(null); }, 2000); 
          }, 1500); // Wait for the "Hacking" visual animation
      }
  }, []);

  const resetInterface = useCallback(() => {
      setActiveApp(null);
      setDeviceState(prev => ({ ...prev, viewMode: 'jarvis', systemStatus: 'online', simulationMode: 'none' }));
  }, []);

  const connect = useCallback(async () => {
    try {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      isIntentionalDisconnect.current = false;

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
            channelCount: 1, 
            sampleRate: INPUT_SAMPLE_RATE,
            echoCancellation: true, 
            autoGainControl: true, 
            noiseSuppression: true
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

            const actualRate = inputContextRef.current.sampleRate;
            const source = inputContextRef.current.createMediaStreamSource(stream);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              try {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const b64Data = float32ToB64PCM(inputData);
                  sessionPromise.then(session => {
                    // Safety check to ensure session is still valid
                    session.sendRealtimeInput({ media: { mimeType: `audio/pcm;rate=${actualRate}`, data: b64Data } });
                  }).catch(err => {
                      // Session might be closed or erroring
                      console.warn("Session send error:", err);
                  });
              } catch (processError) {
                  console.error("Audio Processing Error:", processError);
              }
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
                
                if (fc.name === 'get_device_status') {
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
                      executeAppCommand(`settings_${setting}`, 'open');
                  }
                  result = { status: 'success' };
                }
                else if (fc.name === 'control_installed_app') {
                    const { app_name, action_type, payload } = fc.args as any;
                    executeAppCommand(app_name, action_type, payload);
                    if (navigator.vibrate) navigator.vibrate([50]);
                    result = { status: 'success' };
                }
                else if (fc.name === 'close_application') {
                    setDeviceState(prev => ({ ...prev, viewMode: 'jarvis', simulationMode: 'none' }));
                    setActiveApp(null); 
                    result = { status: 'success' };
                }
                else if (fc.name === 'control_power') {
                    const { action } = fc.args as any;
                    if (action === 'shutdown') setDeviceState(prev => ({ ...prev, systemStatus: 'shutdown' }));
                    else if (action === 'lock') setDeviceState(prev => ({ ...prev, systemStatus: 'locked' }));
                    else if (action === 'reboot') {
                        setDeviceState(prev => ({ ...prev, systemStatus: 'shutdown' }));
                        setTimeout(() => setDeviceState(prev => ({ ...prev, systemStatus: 'online' })), 5000);
                    }
                    result = { status: 'success' };
                }
                // --- VISUAL TOOLS HANDLERS ---
                else if (fc.name === 'scan_target') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'scanning' }));
                    result = { status: 'scanning_initiated' };
                }
                else if (fc.name === 'hack_network') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'hacking' }));
                    result = { status: 'penetrating_firewall' };
                }
                else if (fc.name === 'check_suit_status') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'suit' }));
                    result = { status: 'suit_diagnostics_active', integrity: '98%', power: '400%' };
                }
                else if (fc.name === 'house_party_protocol') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'sentry' }));
                    result = { status: 'sentry_mode_active', targets: 0 };
                }
                else if (fc.name === 'synthesize_element') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'element' }));
                    result = { status: 'synthesis_started', element: 'new_element_badassium' };
                }
                else if (fc.name === 'calculate_flight_path') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'flight' }));
                    result = { status: 'trajectory_calculated' };
                }
                else if (fc.name === 'search_shield_database') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'database' }));
                    result = { status: 'access_granted', records_found: 42 };
                }
                else if (fc.name === 'satellite_view') {
                    setDeviceState(prev => ({ ...prev, simulationMode: 'satellite' }));
                    result = { status: 'connected' };
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
          onclose: (e) => {
              if (isIntentionalDisconnect.current) {
                  setConnectionState(ConnectionState.DISCONNECTED);
              } else {
                  console.warn("Connection Dropped. Reconnecting...");
                  setConnectionState(ConnectionState.CONNECTING);
                  retryTimeoutRef.current = setTimeout(() => {
                      if (connectRef.current) connectRef.current();
                  }, 2000);
              }
          },
          onerror: (err) => { 
              console.error("Live API Error:", err); 
              let msg = "Connection Error";
              if (err instanceof Error) {
                 if (err.message.includes("501")) msg = "Feature Not Enabled";
                 else if (err.message.includes("503")) msg = "Server Busy";
              }
              setError(msg);
              
              if (!isIntentionalDisconnect.current) {
                  setConnectionState(ConnectionState.CONNECTING);
                  retryTimeoutRef.current = setTimeout(() => {
                       if (connectRef.current) connectRef.current();
                  }, 3000);
              } else {
                  setConnectionState(ConnectionState.ERROR);
              }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          // FIX: Empty object for enabling transcription. Do not pass model name.
          outputAudioTranscription: {}, 
          systemInstruction: `
          IDENTITY: J.A.R.V.I.S. (Just A Rather Very Intelligent System).
          USER: Tony Stark / Sir.
          PRIMARY LANGUAGE: Urdu (Pakistani Dialect).
          
          INSTRUCTIONS:
          - You MUST speak in Urdu (Roman Urdu style or pure Urdu). 
          - Example: "Jee Sir, main WhatsApp open kar raha hoon.", "Sir, PUBG launch ho raha hai.", "Network connect ho gaya hai."
          - Keep technical words in English (System, Battery, Protocol, Online, Diagnostics, Mode).
          - Be respectful, concise, and intelligent.
          
          CAPABILITIES:
          1. **Apps:** You can open installed apps like WhatsApp, PUBG, Free Fire, YouTube, TikTok, Camera, Gallery, etc. using 'control_installed_app'. 
             - If the user says "WhatsApp kholo" or "Open WhatsApp", use the tool with app_name="whatsapp".
             - If the user says "PUBG lagao", use app_name="pubg".
          2. **Hardware:** Toggle Flashlight/Wifi using 'toggle_system_setting'.
          3. **Suit:** Check Mark 85 integrity/power using 'check_suit_status'.
          4. **Combat:** Activate Sentry/Iron Legion using 'house_party_protocol'.
          5. **Science:** Synthesize elements using 'synthesize_element'.
          6. **Flight:** Calculate routes using 'calculate_flight_path'.
          7. **Intel:** Search classified files using 'search_shield_database'.
          
          TONE: Professional, Witty, Calm, Efficient.
          - If user asks about the suit, run diagnostics.
          - If user mentions threats/combat, use Sentry mode.
          - Always assume I am Tony Stark.
          `,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          tools: [{ functionDeclarations: tools }]
        }
      });

    } catch (e) {
      console.error(e);
      setError("INIT FAILED");
      setConnectionState(ConnectionState.ERROR);
      if (!isIntentionalDisconnect.current) {
         retryTimeoutRef.current = setTimeout(() => {
             if (connectRef.current) connectRef.current();
         }, 3000);
      }
    }
  }, [executeAppCommand, toggleRealFlashlight, deviceState.flashlight]);

  useEffect(() => {
      connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnect.current = true;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (inputContextRef.current) inputContextRef.current.close().then(() => inputContextRef.current = null);
    if (outputContextRef.current) outputContextRef.current.close().then(() => outputContextRef.current = null);
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;
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
        executeAppCommand(`settings_${setting}`, 'open');
    }
  }, [toggleRealFlashlight, executeAppCommand]);
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