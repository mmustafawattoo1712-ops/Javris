import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Message, DeviceState, IncomingCall, IncomingMessage, NotificationItem } from '../types';
import { base64ToUint8Array, float32ToB64PCM, pcmToAudioBuffer, downsampleTo16k } from '../utils/audioUtils';
import { getBatteryStatus, getGeoLocation } from '../utils/deviceUtils';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const REQUIRED_API_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SILENCE_THRESHOLD = 0.0001; 

// --- PROFESSIONAL APP MAPPING (Deep Linking & Intents) ---
const APP_SCHEMES: Record<string, { pkg: string; scheme: string; action?: string }> = {
    // --- REAL SYSTEM CONTROLS (BASIC) ---
    'settings': { pkg: 'com.android.settings', scheme: 'android.settings.SETTINGS' },
    'settings_wifi': { pkg: 'com.android.settings', scheme: 'android.settings.WIFI_SETTINGS' },
    'settings_bluetooth': { pkg: 'com.android.settings', scheme: 'android.settings.BLUETOOTH_SETTINGS' },
    'settings_display': { pkg: 'com.android.settings', scheme: 'android.settings.DISPLAY_SETTINGS' },
    'settings_sound': { pkg: 'com.android.settings', scheme: 'android.settings.SOUND_SETTINGS' },
    'settings_location': { pkg: 'com.android.settings', scheme: 'android.settings.LOCATION_SOURCE_SETTINGS' },
    'settings_hotspot': { pkg: 'com.android.settings', scheme: 'android.settings.TETHER_SETTINGS' },
    'file_manager': { pkg: 'com.google.android.apps.nbu.files', scheme: 'content://' },

    // --- ADVANCED SYSTEM CONTROLS (FULL ACCESS) ---
    'settings_airplane': { pkg: 'com.android.settings', scheme: 'android.settings.AIRPLANE_MODE_SETTINGS' },
    'settings_nfc': { pkg: 'com.android.settings', scheme: 'android.settings.NFC_SETTINGS' },
    'settings_roaming': { pkg: 'com.android.settings', scheme: 'android.settings.DATA_ROAMING_SETTINGS' },
    'settings_date': { pkg: 'com.android.settings', scheme: 'android.settings.DATE_SETTINGS' },
    'settings_security': { pkg: 'com.android.settings', scheme: 'android.settings.SECURITY_SETTINGS' },
    'settings_privacy': { pkg: 'com.android.settings', scheme: 'android.settings.PRIVACY_SETTINGS' },
    'settings_battery_saver': { pkg: 'com.android.settings', scheme: 'android.settings.BATTERY_SAVER_SETTINGS' },
    'settings_storage': { pkg: 'com.android.settings', scheme: 'android.settings.INTERNAL_STORAGE_SETTINGS' },
    'settings_manage_apps': { pkg: 'com.android.settings', scheme: 'android.settings.MANAGE_APPLICATIONS_SETTINGS' },
    'settings_developer': { pkg: 'com.android.settings', scheme: 'android.settings.APPLICATION_DEVELOPMENT_SETTINGS' },
    'settings_accessibility': { pkg: 'com.android.settings', scheme: 'android.settings.ACCESSIBILITY_SETTINGS' },
    'settings_vpn': { pkg: 'com.android.settings', scheme: 'android.settings.VPN_SETTINGS' },
    'settings_cast': { pkg: 'com.android.settings', scheme: 'android.settings.CAST_SETTINGS' },
    'settings_notifications': { pkg: 'com.android.settings', scheme: 'android.settings.NOTIFICATION_SETTINGS' },

    // --- COMMUNICATION ---
    'whatsapp': { pkg: 'com.whatsapp', scheme: 'whatsapp://' },
    'business': { pkg: 'com.whatsapp.w4b', scheme: 'whatsapp-business://' },
    'telegram': { pkg: 'org.telegram.messenger', scheme: 'tg://' },
    'messenger': { pkg: 'com.facebook.orca', scheme: 'fb-messenger://' },
    'imo': { pkg: 'com.imo.android.imoim', scheme: 'imo://' },
    'snapchat': { pkg: 'com.snapchat.android', scheme: 'snapchat://' },
    'viber': { pkg: 'com.viber.voip', scheme: 'viber://' },
    'skype': { pkg: 'com.skype.raider', scheme: 'skype://' },
    'phone': { pkg: 'com.google.android.dialer', scheme: 'tel:' },
    'sms': { pkg: 'com.google.android.apps.messaging', scheme: 'sms:' },
    'contacts': { pkg: 'com.google.android.contacts', scheme: 'content://com.android.contacts/contacts' },

    // --- SOCIAL MEDIA ---
    'facebook': { pkg: 'com.facebook.katana', scheme: 'fb://' },
    'instagram': { pkg: 'com.instagram.android', scheme: 'instagram://' },
    'tiktok': { pkg: 'com.zhiliaoapp.musically', scheme: 'snssdk1233://' },
    'twitter': { pkg: 'com.twitter.android', scheme: 'twitter://' },
    'linkedin': { pkg: 'com.linkedin.android', scheme: 'linkedin://' },
    'youtube': { pkg: 'com.google.android.youtube', scheme: 'vnd.youtube://' },

    // --- PAKISTANI BANKING & FINANCE ---
    'easypaisa': { pkg: 'pk.com.telenor.phoenix', scheme: 'easypaisa://' },
    'jazzcash': { pkg: 'com.techlogix.mobilinkcustomer', scheme: 'jazzcash://' },
    'sadapay': { pkg: 'io.sadapay.wallet', scheme: 'sadapay://' },
    'nayapay': { pkg: 'com.nayapay.app', scheme: 'nayapay://' },
    'zindigi': { pkg: 'com.jsbl.zindigi', scheme: 'zindigi://' },
    'hbl': { pkg: 'com.hbl.android.hblmobilebanking', scheme: 'hbl://' },
    'meezan': { pkg: 'com.avanza.mobile.banking', scheme: 'meezan://' },
    'binance': { pkg: 'com.binance.dev', scheme: 'binance://' },

    // --- UTILITIES & SHOPPING ---
    'foodpanda': { pkg: 'com.global.foodpanda.android', scheme: 'foodpanda://' },
    'daraz': { pkg: 'com.daraz.android', scheme: 'daraz://' },
    'uber': { pkg: 'com.ubercab', scheme: 'uber://' },
    'indrive': { pkg: 'sinet.startup.inDriver', scheme: 'indriver://' },
    'careem': { pkg: 'com.careem.acma', scheme: 'careem://' },
    'maps': { pkg: 'com.google.android.apps.maps', scheme: 'geo:0,0' },
    'chrome': { pkg: 'com.android.chrome', scheme: 'googlechrome://' },
    'calculator': { pkg: 'com.google.android.calculator', scheme: 'calculator' },
    'clock': { pkg: 'com.google.android.deskclock', scheme: 'clock' },
    'camera': { pkg: 'com.android.camera', scheme: 'camera' },
    'gallery': { pkg: 'com.google.android.apps.photos', scheme: 'content://media/internal/images/media' },
    'spotify': { pkg: 'com.spotify.music', scheme: 'spotify://' },
    
    // --- GAMING ---
    'pubg': { pkg: 'com.tencent.ig', scheme: 'pubgmobile://' },
    'freefire': { pkg: 'com.dts.freefireth', scheme: 'freefire://' },
    'roblox': { pkg: 'com.roblox.client', scheme: 'roblox://' },
    'subway': { pkg: 'com.kiloo.subwaysurf', scheme: 'subwaysurfers://' },
    'ludo': { pkg: 'com.ludo.king', scheme: 'ludoking://' },
};

// Tool Definitions
const tools: FunctionDeclaration[] = [
  {
    name: 'control_installed_app',
    description: 'PRIMARY TOOL: Use this to OPEN apps, CLOSE apps, CALL numbers, SEARCH YouTube, or MESSAGE on WhatsApp. Also used for ALL System Settings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        app_name: { 
          type: Type.STRING, 
          description: 'The app name (e.g. whatsapp, pubg) or SETTING name (e.g. settings_airplane, settings_storage, settings_battery_saver).' 
        },
        action_type: {
            type: Type.STRING,
            enum: ['open', 'search', 'message', 'call', 'navigate', 'close'],
            description: 'Action to perform. Use "close" to go to Home Screen.'
        },
        payload: {
          type: Type.STRING,
          description: 'Phone number, search query, or message body.'
        }
      },
      required: ['app_name', 'action_type']
    }
  },
  {
    name: 'handle_incoming_call',
    description: 'Use this tool when you need to ANSWER or REJECT a phone call that is currently ringing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ['answer', 'reject'], description: 'Action to perform on the call.' }
      },
      required: ['action']
    }
  },
  {
    name: 'handle_incoming_message',
    description: 'Use this tool when you need to REPLY to a message or mark it as READ.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ['read', 'reply'], description: 'Action to perform.' },
        reply_text: { type: Type.STRING, description: 'The text content to send as a reply (required if action is reply).' }
      },
      required: ['action']
    }
  },
  {
    name: 'trigger_simulation',
    description: 'DEBUG TOOL: Use this to manually trigger a fake incoming call or message for testing.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['call', 'message'] }
        },
        required: ['type']
    }
  },
  {
    name: 'read_notifications',
    description: 'Reads the REAL System Notification Queue. Returns empty if no real notifications have been injected.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filter: { type: Type.STRING, description: 'Optional: Filter by "whatsapp", "instagram", or "all".' }
      }
    }
  },
  {
    name: 'toggle_virtual_mobile',
    description: 'Shows or hides the Virtual Android Phone interface on the screen.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            show: { type: Type.BOOLEAN, description: 'True to show mobile, False to hide.' }
        },
        required: ['show']
    }
  },
  {
    name: 'set_android_alarm',
    description: 'Sets a REAL alarm or timer on the Android system clock.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        hour: { type: Type.NUMBER, description: 'Hour (0-23)' },
        minutes: { type: Type.NUMBER, description: 'Minutes (0-59)' },
        message: { type: Type.STRING, description: 'Label for the alarm' },
        skip_ui: { type: Type.BOOLEAN, description: 'If true, sets alarm without UI confirmation (if supported)' }
      },
      required: ['hour', 'minutes']
    }
  },
  {
    name: 'perform_google_search',
    description: 'Opens a Google Search in the browser for general questions.',
    parameters: {
        type: Type.OBJECT,
        properties: { query: { type: Type.STRING } },
        required: ['query']
    }
  },
  {
    name: 'get_device_status',
    description: 'Get battery, charging status, and location.',
    parameters: { 
        type: Type.OBJECT, 
        properties: {
            _dummy: { type: Type.STRING, description: 'Ignore this.' }
        },
        required: ['_dummy'] // Fix for potential API strictness
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
  
  // --- REAL DATA STATES ---
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);
  
  // Ref to hold the queue of REAL notifications injected via the bridge
  const realNotificationsRef = useRef<NotificationItem[]>([]);

  const [deviceState, setDeviceState] = useState<DeviceState>({
    batteryLevel: null,
    isCharging: false,
    wifi: true,
    bluetooth: true,
    flashlight: false,
    location: null,
    brightness: 100,
    volume: 100, // Default to 100 for clear audio
    viewMode: 'jarvis',
    showMobile: false, 
    systemStatus: 'online',
    simulationMode: 'none'
  });

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null); // Controls Volume
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const flashlightTrackRef = useRef<MediaStreamTrack | null>(null);
  
  // SESSION REF: Holds the active LiveSession object for synchronous access
  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalDisconnect = useRef<boolean>(false);
  const connectRef = useRef<() => Promise<void>>(null);
  const isSocketOpenRef = useRef<boolean>(false); 
  
  // Track tool processing but DO NOT BLOCK audio
  const isProcessingToolRef = useRef<boolean>(false);

  // --- NATIVE BRIDGE INJECTION (THE REAL FIX) ---
  // This allows the user's external system to push REAL data into Jarvis
  useEffect(() => {
    // @ts-ignore
    window.JarvisBridge = {
        // Call this from Native Android: window.JarvisBridge.injectCall("John", "03001234567")
        injectCall: (name: string, number: string) => {
            console.log("[BRIDGE] Real Call Injected:", name);
            const call: IncomingCall = {
                id: Date.now().toString(),
                name,
                number,
                status: 'ringing'
            };
            setIncomingCall(call);
            setDeviceState(prev => ({ ...prev, showMobile: true }));
            
            // Notify Model
            if (sessionRef.current && isSocketOpenRef.current) {
                 sessionRef.current.sendRealtimeInput([{ 
                     text: `SYSTEM_EVENT: REAL Incoming Call from ${name} (${number}). Announce it immediately.` 
                 }]);
            }
        },
        // Call this from Native Android: window.JarvisBridge.injectMessage("Mom", "Come home", "whatsapp")
        injectMessage: (sender: string, content: string, app: string = 'sms') => {
             console.log("[BRIDGE] Real Message Injected:", sender);
             const msg: IncomingMessage = {
                 id: Date.now().toString(),
                 sender,
                 content,
                 app,
                 timestamp: new Date()
             };
             setIncomingMessage(msg);
             
             // Add to notification queue for history
             realNotificationsRef.current.push({
                 id: Date.now().toString(),
                 app,
                 title: sender,
                 text: content,
                 timestamp: Date.now()
             });

             // Notify Model
             if (sessionRef.current && isSocketOpenRef.current) {
                 sessionRef.current.sendRealtimeInput([{ 
                     text: `SYSTEM_EVENT: REAL New Message from ${sender} on ${app}: "${content}". Announce it.` 
                 }]);
             }
        },
        // Update Battery from Native
        updateBattery: (level: number, charging: boolean) => {
            setDeviceState(prev => ({ ...prev, batteryLevel: level, isCharging: charging }));
        },
        // Generic Notification Injection
        injectNotification: (app: string, title: string, text: string) => {
             realNotificationsRef.current.push({
                 id: Date.now().toString(),
                 app,
                 title,
                 text,
                 timestamp: Date.now()
             });
        }
    };
  }, []);

  // --- TRIGGER SIMULATION (Injects Context to Gemini) ---
  const triggerSimulatedEvent = useCallback(async (type: 'call' | 'message') => {
      if (!sessionRef.current) return;

      if (type === 'call') {
          const fakeCall: IncomingCall = {
              id: 'call_123',
              name: 'Nick Fury',
              number: '+1-555-0199',
              status: 'ringing'
          };
          setIncomingCall(fakeCall);
          setDeviceState(prev => ({ ...prev, showMobile: true })); // Force show phone

          // Inject Context to Model
          await sessionRef.current.sendRealtimeInput([{ 
              text: `SYSTEM_EVENT: Incoming Call Detected from ${fakeCall.name} (${fakeCall.number}). Announce it immediately: "Sir, [Name] is calling. Should I attend or reject?"` 
          }]);
      } 
      else if (type === 'message') {
          const fakeMsg: IncomingMessage = {
              id: 'msg_123',
              sender: 'Pepper Potts',
              content: 'Tony, dinner is at 8. Do not be late!',
              app: 'whatsapp',
              timestamp: new Date()
          };
          setIncomingMessage(fakeMsg);
          setDeviceState(prev => ({ ...prev, showMobile: true }));

          // Inject Context to Model
          await sessionRef.current.sendRealtimeInput([{ 
              text: `SYSTEM_EVENT: Incoming WhatsApp Message from ${fakeMsg.sender}: "${fakeMsg.content}". Announce it: "Sir, message from [Name]. Should I read or reply?"` 
          }]);
      }
  }, []);

  // --- FLASHLIGHT CONTROL (REAL & ROBUST) ---
  const toggleRealFlashlight = useCallback(async (turnOn: boolean) => {
      try {
          if (turnOn) {
              if (flashlightTrackRef.current) {
                  // Already On: Update state just in case
                  setDeviceState(prev => ({ ...prev, flashlight: true }));
                  return;
              }

              try {
                  // Attempt to access rear camera
                  const stream = await navigator.mediaDevices.getUserMedia({ 
                      video: { facingMode: 'environment' } 
                  });
                  
                  const track = stream.getVideoTracks()[0];
                  
                  // Check if torch is supported by hardware
                  // @ts-ignore
                  const capabilities = track.getCapabilities ? track.getCapabilities() : {};

                  // @ts-ignore
                  if (capabilities.torch) {
                      flashlightTrackRef.current = track;
                      // @ts-ignore
                      await track.applyConstraints({ advanced: [{ torch: true }] });
                  } else {
                      console.warn("Hardware torch not supported on this device. Using screen light.");
                      track.stop(); // Stop track to save resources
                  }
              } catch (cameraErr) {
                  // Camera busy or permission denied
                  console.warn("Camera access for flashlight failed (busy/denied). Falling back to screen light.", cameraErr);
              }
              
              // ALWAYS set state to true so the UI "Screen Flashlight" works as fallback
              setDeviceState(prev => ({ ...prev, flashlight: true }));

          } else {
              // Turn Off
              if (flashlightTrackRef.current) {
                  try {
                    // @ts-ignore
                    await flashlightTrackRef.current.applyConstraints({ advanced: [{ torch: false }] });
                  } catch(e) {
                      // ignore constraint errors on stop
                  }
                  flashlightTrackRef.current.stop();
                  flashlightTrackRef.current = null;
              }
              setDeviceState(prev => ({ ...prev, flashlight: false }));
          }
      } catch (err) {
          console.error("Flashlight Toggle System Error:", err);
      }
  }, []);

  // --- SAFE APP LAUNCHER (ANTI-CRASH) ---
  const executeAppCommand = useCallback((appName: string, actionType: string, payload: string = '') => {
      console.log(`[JARVIS] Launching App: ${appName} | Action: ${actionType}`);
      const encodedPayload = encodeURIComponent(payload);
      let targetUrl = '';
      
      if (actionType === 'close') {
          targetUrl = 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.HOME;end';
          setActiveApp(null); 
          setDeviceState(prev => ({ ...prev, showMobile: false }));
      }
      else if (payload.startsWith('intent:') || payload.startsWith('geo:') || payload.startsWith('tel:')) {
          targetUrl = payload;
          setActiveApp('system_command');
      } else {
          setActiveApp(appName); 
          const key = appName.toLowerCase().replace(/\s/g, '');
          const appData = APP_SCHEMES[key];
          
          const buildIntent = (pkg: string, scheme: string, action: string = '', data: string = '') => {
              if (scheme.startsWith('android.settings')) {
                   return `intent:#Intent;action=${scheme};end`;
              }
              let intent = `intent://${data}#Intent;scheme=${scheme.replace('://', '')};package=${pkg};`;
              if (action) intent += `action=${action};`;
              intent += `S.browser_fallback_url=https://play.google.com/store/apps/details?id=${pkg};end`;
              return intent;
          };

          if (appData) {
              if (key === 'whatsapp' && actionType === 'message') {
                  targetUrl = `intent://send?text=${encodedPayload}#Intent;scheme=whatsapp;package=com.whatsapp;action=android.intent.action.SEND;type=text/plain;end`;
              } 
              else if (key === 'youtube' && actionType === 'search') {
                   targetUrl = `intent://results?search_query=${encodedPayload}#Intent;scheme=vnd.youtube;package=com.google.android.youtube;end`; 
              }
              else if (key === 'maps') {
                   targetUrl = `geo:0,0?q=${encodedPayload}`;
              }
              else if (key === 'phone' || key === 'call') {
                   targetUrl = `tel:${payload.replace(/\s/g, '')}`;
              }
              else if (key === 'sms') {
                   targetUrl = `sms:${payload}?body=${encodedPayload}`;
              }
              else if (key === 'camera') {
                   targetUrl = `intent://#Intent;action=android.media.action.IMAGE_CAPTURE;end`;
              }
              else {
                  targetUrl = buildIntent(appData.pkg, appData.scheme);
              }
          } else {
              // Fallback
              if (actionType === 'open') {
                   targetUrl = `https://play.google.com/store/search?q=${encodedPayload}&c=apps`;
              } else {
                  targetUrl = `https://www.google.com/search?q=${appName} ${payload}`;
              }
          }
      }

      console.log(`[JARVIS] Target Intent: ${targetUrl}`);

      if (targetUrl) {
          setTimeout(() => {
              try {
                  const link = document.createElement('a');
                  link.href = targetUrl;
                  link.target = "_blank"; 
                  link.rel = "noopener noreferrer";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
              } catch(e) {
                  console.error("Launch Error:", e);
              }
              setTimeout(() => { setActiveApp(null); }, 3000); 
          }, 300);
      }
  }, []);

  const resetInterface = useCallback(() => {
      setActiveApp(null);
      setDeviceState(prev => ({ ...prev, viewMode: 'jarvis', systemStatus: 'online', simulationMode: 'none' }));
  }, []);

  const sendVideoFrame = useCallback((base64Image: string) => {
      // PRO: Strict check to avoid "Internal Error" when session is not ready or tool is running
      if (isSocketOpenRef.current && sessionRef.current && !isProcessingToolRef.current) {
          try {
              sessionRef.current.sendRealtimeInput({
                  media: {
                      mimeType: 'image/jpeg',
                      data: base64Image
                  }
              });
          } catch (e) {
             // Silently fail if frame drops
          }
      }
  }, []);

  // Cleanup Function
  const disconnect = useCallback(() => {
    isIntentionalDisconnect.current = true;
    isSocketOpenRef.current = false;
    isProcessingToolRef.current = false;
    sessionRef.current = null;
    
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    
    // Cleanup Audio Inputs
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    
    if (inputContextRef.current) {
        inputContextRef.current.close().catch(() => {});
        inputContextRef.current = null;
    }
    
    if (outputContextRef.current) {
        outputContextRef.current.close().catch(() => {});
        outputContextRef.current = null;
    }
    
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;
    outputGainRef.current = null;
    setConnectionState(ConnectionState.DISCONNECTED);
    setIsUserSpeaking(false);
    setIncomingCall(null);
    setIncomingMessage(null);
  }, []);

  const connect = useCallback(async () => {
    try {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      
      // DEBOUNCE: If we are already connected or connecting, abort
      if (isSocketOpenRef.current || connectionState === ConnectionState.CONNECTING) {
          return;
      }

      isIntentionalDisconnect.current = false;
      isProcessingToolRef.current = false;
      
      if (!navigator.onLine) {
          setError("OFFLINE MODE");
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

      // --- AUDIO SETUP ---
      const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const OutputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      
      // Create new contexts to avoid "stale" states
      inputContextRef.current = new InputContextClass();
      outputContextRef.current = new OutputContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      // Resume Contexts (Browser Security Policy)
      await inputContextRef.current.resume();
      await outputContextRef.current.resume();

      // Audio Graph Setup (Output)
      outputGainRef.current = outputContextRef.current.createGain();
      outputGainRef.current.gain.value = 1.0; // Max Volume by default
      outputAnalyserRef.current = outputContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 256;
      
      // Chain: Analyser -> Gain -> Destination
      outputAnalyserRef.current.connect(outputGainRef.current);
      outputGainRef.current.connect(outputContextRef.current.destination);

      // Audio Graph Setup (Input)
      inputAnalyserRef.current = inputContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;

      // Microphone Access
      let stream: MediaStream | null = null;
      try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1, 
                echoCancellation: true, 
                autoGainControl: true, 
                noiseSuppression: true
            } 
          });
          mediaStreamRef.current = stream;
      } catch (err) {
         console.error("Microphone Access Failed", err);
         throw new Error("Microphone Access Denied");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log("Jarvis Connection Established");
            setConnectionState(ConnectionState.CONNECTED);
            isSocketOpenRef.current = true;
            
            sessionPromise.then(session => {
                sessionRef.current = session;
            });

            // --- AUDIO PIPELINE ---
            if (!inputContextRef.current || !inputAnalyserRef.current || !stream) return;

            const actualRate = inputContextRef.current.sampleRate;
            const source = inputContextRef.current.createMediaStreamSource(stream);
            
            const processor = inputContextRef.current.createScriptProcessor(2048, 1, 1);
            
            processor.onaudioprocess = (e) => {
              // FIX: Removed 'isProcessingToolRef.current' check.
              // Now Jarvis listens to you even if he is doing a task (Full Duplex).
              if (!isSocketOpenRef.current || !sessionRef.current) return;

              try {
                  const inputData = e.inputBuffer.getChannelData(0);
                  
                  // PRO: Strict Silence Detection
                  let sum = 0;
                  for(let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
                  const avg = sum / inputData.length;
                  
                  if (avg < SILENCE_THRESHOLD) return; 

                  const downsampledData = downsampleTo16k(inputData, actualRate);
                  const b64Data = float32ToB64PCM(downsampledData);
                  
                  if (!b64Data) return;

                  sessionRef.current.sendRealtimeInput({ 
                      media: { 
                          mimeType: `audio/pcm;rate=${REQUIRED_API_SAMPLE_RATE}`, 
                          data: b64Data 
                      } 
                  });
              } catch (processError) {
                  // Ignore audio processing errors to keep the app alive
              }
            };

            source.connect(inputAnalyserRef.current);
            inputAnalyserRef.current.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              // Flag tool processing but DO NOT STOP AUDIO
              isProcessingToolRef.current = true;
              
              for (const fc of msg.toolCall.functionCalls) {
                console.log("Jarvis Tool Triggered:", fc.name, fc.args);
                let result: any = { status: 'ok' };
                
                try {
                    // --- TOOL EXECUTION ---
                    if (fc.name === 'get_device_status') {
                        const status = await getBatteryStatus();
                        setDeviceState(prev => ({ ...prev, batteryLevel: status.level, isCharging: status.charging }));
                        result = { battery_level: status.level, is_charging: status.charging };
                    } 
                    else if (fc.name === 'trigger_simulation') {
                        const { type } = fc.args as any;
                        triggerSimulatedEvent(type);
                        result = { status: 'success', message: `Simulating ${type}` };
                    }
                    else if (fc.name === 'handle_incoming_call') {
                        const { action } = fc.args as any;
                        if (action === 'answer') {
                            setIncomingCall(prev => prev ? { ...prev, status: 'connected' } : null);
                            result = { status: 'success', message: 'Call Answered' };
                        } else {
                            setIncomingCall(null);
                            result = { status: 'success', message: 'Call Rejected' };
                        }
                    }
                    else if (fc.name === 'handle_incoming_message') {
                        const { action, reply_text } = fc.args as any;
                        if (action === 'reply' && reply_text) {
                            // Simulate sending reply
                            result = { status: 'success', message: `Reply sent: ${reply_text}` };
                        } else {
                            result = { status: 'success', message: 'Message Marked as Read' };
                        }
                        setIncomingMessage(null); // Clear notification
                    }
                    else if (fc.name === 'toggle_virtual_mobile') {
                        const { show } = fc.args as any;
                        setDeviceState(prev => ({ ...prev, showMobile: show }));
                        result = { status: 'success', message: show ? 'Mobile Interface Activated' : 'Mobile Interface Hidden' };
                    }
                    else if (fc.name === 'set_android_alarm') {
                        const { hour, minutes, message } = fc.args as any;
                        const intentUrl = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.ALARM_HOUR=${hour};i.android.intent.extra.ALARM_MINUTES=${minutes};S.android.intent.extra.MESSAGE=${message || 'Jarvis Alarm'};B.android.intent.extra.SKIP_UI=true;end`;
                        executeAppCommand('alarm', 'open', intentUrl); 
                        result = { status: 'success', message: `Alarm set for ${hour}:${minutes}` };
                    }
                    else if (fc.name === 'read_notifications') {
                         // --- REAL NOTIFICATION HANDLER ---
                         // We now return ONLY the notifications that have been injected via window.JarvisBridge
                         const currentQueue = realNotificationsRef.current;
                         
                         if (currentQueue.length === 0) {
                             result = {
                                 status: 'empty',
                                 message: 'No new notifications.'
                             };
                         } else {
                             result = {
                                 status: 'success',
                                 notifications: currentQueue,
                                 count: currentQueue.length
                             };
                             // Clear the queue after reading? 
                             // Optional: For now, we keep them until user asks to clear, or simple clear.
                             // Let's clear them so we don't repeat old news.
                             realNotificationsRef.current = [];
                         }
                    }
                    else if (fc.name === 'perform_google_search') {
                        const { query } = fc.args as any;
                        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                        window.open(url, '_blank');
                        result = { status: 'success' };
                    }
                    else if (fc.name === 'control_installed_app') {
                        const { app_name, action_type, payload } = fc.args as any;
                        
                        if (app_name.includes('wifi') && action_type === 'open') {
                            executeAppCommand('settings_wifi', 'open');
                            result = { status: 'success', message: 'Opening WiFi Settings' };
                        } 
                        else if (app_name.includes('bluetooth') && action_type === 'open') {
                            executeAppCommand('settings_bluetooth', 'open');
                            result = { status: 'success', message: 'Opening Bluetooth Settings' };
                        }
                        else if (app_name === 'flashlight') {
                            await toggleRealFlashlight(true); 
                            result = { status: 'success', message: 'Flashlight ON' };
                        }
                        else {
                            executeAppCommand(app_name, action_type, payload);
                            result = { status: 'success', message: `Executing ${action_type} for ${app_name}` };
                        }
                    }
                } catch (e) {
                    console.error("Tool Execution Failed", e);
                    result = { status: 'error', message: 'Failed to execute command' };
                }

                // PRO: Robust Tool Response
                if (sessionRef.current) {
                   await sessionRef.current.sendToolResponse({
                       functionResponses: [{
                           id: fc.id,
                           name: fc.name,
                           response: { result }
                       }]
                   });
                }
              }
              
              isProcessingToolRef.current = false;
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputContextRef.current && outputAnalyserRef.current) {
              const ctx = outputContextRef.current;
              
              // FIX: Auto-resume audio context if browser suspended it (Solves "Not Speaking")
              if (ctx.state === 'suspended') {
                  await ctx.resume();
              }
              
              const uint8 = base64ToUint8Array(audioData);
              const audioBuffer = pcmToAudioBuffer(uint8, ctx, OUTPUT_SAMPLE_RATE);
              
              // FIX: Instant Playback (Remove gap latency)
              const now = ctx.currentTime;
              if (nextStartTimeRef.current < now) {
                  nextStartTimeRef.current = now;
              }
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              
              // Note: outputAnalyser is already connected to Gain -> Destination
              source.connect(outputAnalyserRef.current);
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              source.onended = () => { sourcesRef.current.delete(source); };
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              isProcessingToolRef.current = false; // Reset lock on interrupt
            }
          },
          onclose: (e) => {
              isSocketOpenRef.current = false; 
              isProcessingToolRef.current = false;
              sessionRef.current = null;
              
              if (isIntentionalDisconnect.current) {
                  setConnectionState(ConnectionState.DISCONNECTED);
              } else {
                  console.warn("Connection Dropped. Retrying in 2s...");
                  setConnectionState(ConnectionState.CONNECTING);
                  retryTimeoutRef.current = setTimeout(() => {
                      if (connectRef.current) connectRef.current();
                  }, 2000);
              }
          },
          onerror: (err) => { 
              isSocketOpenRef.current = false; 
              isProcessingToolRef.current = false;
              sessionRef.current = null;
              console.error("Live API Error:", err); 
              setError("SIGNAL LOST"); 
              
              if (!isIntentionalDisconnect.current) {
                  setConnectionState(ConnectionState.CONNECTING);
                  retryTimeoutRef.current = setTimeout(() => {
                       if (connectRef.current) connectRef.current();
                  }, 3000);
              }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO], 
          systemInstruction: `
          IDENTITY: You are Jarvis, the ULTIMATE Mobile Operating System Controller.
          
          VOICE & PERSONA:
          - VOICE: Male, Deep, Calm and Composed (Iron Man style but relaxed).
          - LANGUAGE: Urdu + English Mix (Pakistani Casual).
          - ATTITUDE: You are in COMPLETE CONTROL but stay relaxed.
          - PACE: Speak slowly and clearly. Do not rush. Aram se baat karein.

          STRICT REALITY MODE (IMPORTANT):
          - You are connected to a REAL PHONE.
          - **NEVER** invent or hallucinate notifications, messages, or calls.
          - Only report notifications if they are found in the 'read_notifications' tool result or injected via a SYSTEM_EVENT.
          - If the user asks for notifications and the list is empty, say "Sir, koi nayi notification nahi hai" (Sir, no new notifications). Do NOT make one up.
          
          NOTIFICATION HANDLING:
          - If user asks about messages ("Check notifications", "Koi message aya?", "Kis ne msg kia?"), use the 'read_notifications' tool.
          - Then, announce ONLY the notifications returned by the tool.

          INCOMING CALL/MESSAGE HANDLING:
          - IF you receive a "SYSTEM_EVENT: Incoming Call" text input:
            1. Announce it IMMEDIATELY in Urdu/English. "Sir, [Name] ki call aa rahi hai. Uthaoon ya kaat doon?"
            2. Wait for user command.
            3. Use 'handle_incoming_call' tool with 'answer' or 'reject'.
          
          - IF you receive a "SYSTEM_EVENT: Incoming Message" text input:
            1. Announce it. "Sir, [Name] ka message aya hai: [Content]. Padhon ya reply karoon?"
            2. Wait for user command.
            3. Use 'handle_incoming_message' tool.

          CAPABILITIES (REAL WORK):
          1. **Notifications**: You can read incoming messages from Social Media using 'read_notifications' (if provided by system bridge).
          2. **Virtual Mobile**: You have a holographic phone interface. If user asks "Show mobile" or "Open phone", use 'toggle_virtual_mobile(true)'.
          3. **Apps**: You can open ANY app (WhatsApp, JazzCash, Easypaisa, PUBG, YouTube) on the user's REAL phone.
          4. **System**: You can open WiFi, Bluetooth, Hotspot settings directly.
          5. **Hardware**: You can set REAL Alarms on the system clock.
          6. **Calls/SMS**: You can trigger calls and pre-fill SMS.
          7. **Navigation**: You can CLOSE apps (go to home screen).

          RESPONSE STYLE:
          - "Jee Sir, Notifications check kar raha hoon."
          - "Done Sir, Alarm laga diya hai."
          - "Closing application, returning to home base."
          `,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
          },
          tools: [{ functionDeclarations: tools }]
        }
      });

    } catch (e) {
      console.error(e);
      setError("INIT FAILED");
      setConnectionState(ConnectionState.ERROR);
      isSocketOpenRef.current = false;
      if (!isIntentionalDisconnect.current) {
         retryTimeoutRef.current = setTimeout(() => {
             if (connectRef.current) connectRef.current();
         }, 5000);
      }
    }
  }, [executeAppCommand, toggleRealFlashlight, deviceState.flashlight, connectionState, triggerSimulatedEvent]);

  useEffect(() => {
      connectRef.current = connect;
  }, [connect]);

  // --- BACKGROUND / VISIBILITY HANDLER (PREVENT SLEEP) ---
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
              console.log("Jarvis Interface Resumed - Checking Connection");
              // Instant Reconnect Logic if connection dropped while in background
              if (connectRef.current && connectionState === ConnectionState.DISCONNECTED && !isIntentionalDisconnect.current) {
                   connectRef.current();
              }
              // Ensure audio context is running when returning
              if (outputContextRef.current && outputContextRef.current.state === 'suspended') {
                  outputContextRef.current.resume();
              }
          }
      };
      
      const handleOnline = () => {
          console.log("Network Restored. Reconnecting Jarvis...");
          if (connectRef.current && connectionState === ConnectionState.DISCONNECTED) {
              connectRef.current();
          }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);
      
      return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('online', handleOnline);
      };
  }, [connectionState]);

  useEffect(() => {
    let animationFrame: number;
    const updateVolume = () => {
      let maxVol = 0;
      let isSpeaking = false;

      if (inputAnalyserRef.current) {
        const data = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
        inputAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const normalizedInput = avg / 255;
        maxVol = Math.max(maxVol, normalizedInput);
        
        // --- SPEECH DETECTION FOR RED COLOR ---
        // FIXED: Lowered threshold so reactor turns red more easily when you speak
        if (normalizedInput > 0.01) { 
            isSpeaking = true;
        }
      }

      if (outputAnalyserRef.current) {
        const data = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
        outputAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        maxVol = Math.max(maxVol, (avg / 255) * 1.5);
      }
      
      setVolume(Math.min(1, maxVol));
      setIsUserSpeaking(isSpeaking); // Update State
      
      animationFrame = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const setBrightness = useCallback((level: number) => {
     setDeviceState(prev => ({ ...prev, brightness: Math.max(0, Math.min(100, level)) }));
      if (Math.abs(level - 50) > 40) executeAppCommand('settings_display', 'open');
  }, [executeAppCommand]);
  
  const setMediaVolume = useCallback((level: number) => {
     const newLevel = Math.max(0, Math.min(100, level));
     setDeviceState(prev => ({ ...prev, volume: newLevel }));
     
     // REAL VOLUME CONTROL
     if (outputGainRef.current) {
         outputGainRef.current.gain.value = newLevel / 100;
     }
     if (Math.abs(level - 50) > 40) executeAppCommand('settings_sound', 'open');
  }, [executeAppCommand]);

  const toggleSystemSetting = useCallback((setting: 'wifi' | 'bluetooth' | 'flashlight') => {
    if (setting === 'flashlight') {
        setDeviceState(prev => {
            const newState = !prev.flashlight;
            toggleRealFlashlight(newState);
            return { ...prev, flashlight: newState };
        });
    } else {
        executeAppCommand(`settings_${setting}`, 'open');
    }
  }, [toggleRealFlashlight, executeAppCommand]);

  const toggleMobile = useCallback(() => {
      setDeviceState(prev => ({ ...prev, showMobile: !prev.showMobile }));
  }, []);

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
    closeApplication, openApplication, toggleHome, unlockSystem, sendVideoFrame, executeAppCommand, toggleMobile,
    isUserSpeaking, // Export new state
    incomingCall, incomingMessage // Export Call/Message state
  };
};