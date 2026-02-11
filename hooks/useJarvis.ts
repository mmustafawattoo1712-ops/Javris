import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Message, DeviceState, IncomingCall, IncomingMessage, NotificationItem } from '../types';
import { base64ToUint8Array, float32ToB64PCM, pcmToAudioBuffer, downsampleTo16k } from '../utils/audioUtils';
import { getBatteryStatus, getGeoLocation } from '../utils/deviceUtils';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const REQUIRED_API_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const RECONNECT_DELAY_MS = 2000; // 2 seconds between retries

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
    'google': { pkg: 'com.google.android.googlequicksearchbox', scheme: 'google://' },

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
          description: 'Phone number, search query, or message body. Send "empty" if not needed.'
        }
      },
      required: ['app_name', 'action_type', 'payload']
    }
  },
  {
    name: 'toggle_setting',
    description: 'Toggle hardware settings like Flashlight, WiFi, or Bluetooth.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { 
            type: Type.STRING, 
            enum: ['flashlight', 'wifi', 'bluetooth'],
            description: 'The hardware component to toggle.' 
        },
        state: {
            type: Type.STRING,
            enum: ['on', 'off'],
            description: 'The desired state.'
        }
      },
      required: ['target', 'state']
    }
  },
  {
    name: 'adjust_level',
    description: 'Adjust device levels like Volume or Brightness.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: { 
            type: Type.STRING, 
            enum: ['volume', 'brightness'],
            description: 'The target to adjust.' 
        },
        level: {
            type: Type.NUMBER,
            description: 'The percentage level (0-100).'
        }
      },
      required: ['target', 'level']
    }
  },
  {
    name: 'media_controls',
    description: 'MEDIA CONTROL: Play, Pause, Next, or Previous track for music/video.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { 
            type: Type.STRING, 
            enum: ['play', 'pause', 'next', 'previous'],
            description: 'Media command to execute.'
        }
      },
      required: ['command']
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
        reply_text: { type: Type.STRING, description: 'The text content to send as a reply. Send "none" if action is read.' }
      },
      required: ['action', 'reply_text']
    }
  },
  {
    name: 'toggle_virtual_mobile',
    description: 'Shows or hides the Virtual Android Phone interface on the screen.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            show: { type: Type.STRING, enum: ["true", "false"], description: 'Set to "true" to show mobile, "false" to hide.' }
        },
        required: ['show']
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

  // Transcription Buffers
  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');

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

  // AUDIO REFS - Persist across re-connects
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const flashlightTrackRef = useRef<MediaStreamTrack | null>(null);
  
  // SESSION REF
  const sessionRef = useRef<any>(null);
  
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPermanentConnectionRef = useRef<boolean>(false); // THE DAEMON FLAG
  const isConnectingRef = useRef<boolean>(false); // THE RACE CONDITION GUARD
  const isSocketOpenRef = useRef<boolean>(false); 
  
  const isProcessingToolRef = useRef<boolean>(false);

  // --- NATIVE BRIDGE INJECTION ---
  useEffect(() => {
    // @ts-ignore
    window.JarvisBridge = {
        injectCall: (name: string, number: string) => {
            console.log("[BRIDGE] Real Call Injected:", name);
            const call: IncomingCall = { id: Date.now().toString(), name, number, status: 'ringing' };
            setIncomingCall(call);
            setDeviceState(prev => ({ ...prev, showMobile: true }));
            if (sessionRef.current && isSocketOpenRef.current) {
                 sessionRef.current.sendRealtimeInput([{ text: `SYSTEM_EVENT: REAL Incoming Call from ${name} (${number}).` }]);
            }
        },
        injectMessage: (sender: string, content: string, app: string = 'sms') => {
             console.log("[BRIDGE] Real Message Injected:", sender);
             const msg: IncomingMessage = { id: Date.now().toString(), sender, content, app, timestamp: new Date() };
             setIncomingMessage(msg);
             realNotificationsRef.current.push({ id: Date.now().toString(), app, title: sender, text: content, timestamp: Date.now() });
             if (sessionRef.current && isSocketOpenRef.current) {
                 sessionRef.current.sendRealtimeInput([{ text: `SYSTEM_EVENT: REAL New Message from ${sender} on ${app}: "${content}".` }]);
             }
        },
        updateBattery: (level: number, charging: boolean) => {
            setDeviceState(prev => ({ ...prev, batteryLevel: level, isCharging: charging }));
        },
        injectNotification: (app: string, title: string, text: string) => {
             realNotificationsRef.current.push({ id: Date.now().toString(), app, title, text, timestamp: Date.now() });
        }
    };
  }, []);

  const toggleRealFlashlight = useCallback(async (turnOn: boolean) => {
      try {
          if (turnOn) {
              if (flashlightTrackRef.current) return;
              let stream: MediaStream;
              try {
                  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
              } catch (envErr) {
                  try {
                      stream = await navigator.mediaDevices.getUserMedia({ video: true });
                  } catch (fatalErr) {
                      throw new Error("Camera unavailable");
                  }
              }
              const track = stream.getVideoTracks()[0];
              flashlightTrackRef.current = track;
              setTimeout(async () => {
                  if (!flashlightTrackRef.current) { track.stop(); return; }
                  try {
                      // @ts-ignore
                      await track.applyConstraints({ advanced: [{ torch: true }] });
                  } catch (e) { setDeviceState(prev => ({ ...prev, brightness: 100 })); }
              }, 500);
              setDeviceState(prev => ({ ...prev, flashlight: true }));
          } else {
              if (flashlightTrackRef.current) {
                  const track = flashlightTrackRef.current;
                  flashlightTrackRef.current = null;
                  // @ts-ignore
                  try { await track.applyConstraints({ advanced: [{ torch: false }] }); } catch(e) {}
                  track.stop();
              }
              setDeviceState(prev => ({ ...prev, flashlight: false }));
          }
      } catch (err) {
          if (turnOn) setDeviceState(prev => ({ ...prev, brightness: 100, flashlight: true }));
      }
  }, []);

  const executeAppCommand = useCallback((appName: string, actionType: string, payload: string = '') => {
      console.log(`[JARVIS] Launching App: ${appName} | Action: ${actionType}`);
      const encodedPayload = encodeURIComponent(payload);
      let targetUrl = '';
      
      if (actionType === 'close') {
          setActiveApp(null); 
          setDeviceState(prev => ({ ...prev, showMobile: false, viewMode: 'jarvis', simulationMode: 'none' }));
          targetUrl = 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.HOME;end';
      }
      else if (payload.startsWith('intent:') || payload.startsWith('geo:') || payload.startsWith('tel:')) {
          targetUrl = payload;
          setActiveApp('system_command');
      } else {
          setActiveApp(appName); 
          const key = appName.toLowerCase().replace(/\s/g, '');
          const appData = APP_SCHEMES[key];
          
          if (appData) {
              if (key === 'whatsapp' && actionType === 'message') targetUrl = `intent://send?text=${encodedPayload}#Intent;scheme=whatsapp;package=com.whatsapp;action=android.intent.action.SEND;type=text/plain;end`;
              else if (key === 'youtube' && actionType === 'search') targetUrl = `intent://results?search_query=${encodedPayload}#Intent;scheme=vnd.youtube;package=com.google.android.youtube;end`; 
              else if (key === 'maps') targetUrl = `geo:0,0?q=${encodedPayload}`;
              else if (key === 'phone' || key === 'call') targetUrl = `tel:${payload.replace(/\s/g, '')}`;
              else if (key === 'sms') targetUrl = `sms:${payload}?body=${encodedPayload}`;
              else if (key === 'camera') targetUrl = `intent://#Intent;action=android.media.action.IMAGE_CAPTURE;end`;
              else if ((key === 'google' || key === 'chrome') && actionType === 'search') targetUrl = `https://www.google.com/search?q=${encodedPayload}`;
              else {
                  if (appData.scheme.startsWith('android.settings')) targetUrl = `intent:#Intent;action=${appData.scheme};end`;
                  else targetUrl = `intent://${payload}#Intent;scheme=${appData.scheme.replace('://', '')};package=${appData.pkg};end`;
              }
          } else {
              if (actionType === 'open') targetUrl = `https://play.google.com/store/search?q=${encodedPayload}&c=apps`;
              else targetUrl = `https://www.google.com/search?q=${appName} ${payload}`;
          }
      }

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
              } catch(e) {}
              if (actionType !== 'close') setTimeout(() => { setActiveApp(null); }, 3000); 
          }, 300);
      }
  }, []);

  const sendVideoFrame = useCallback((base64Image: string) => {
      if (isSocketOpenRef.current && sessionRef.current && !isProcessingToolRef.current) {
          try {
              sessionRef.current.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Image } });
          } catch (e) { }
      }
  }, []);

  const disconnect = useCallback(async () => {
    // ABORT COMMAND - User manually killed connection
    isPermanentConnectionRef.current = false;
    isSocketOpenRef.current = false;
    
    // Clear retries
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    
    // FULL AUDIO TEARDOWN
    if (scriptProcessorRef.current) { try { scriptProcessorRef.current.disconnect(); } catch(e){} scriptProcessorRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
    if (inputContextRef.current) { try { await inputContextRef.current.close(); } catch(e) {} inputContextRef.current = null; }
    if (outputContextRef.current) { try { await outputContextRef.current.close(); } catch(e) {} outputContextRef.current = null; }
    
    sessionRef.current = null;
    isConnectingRef.current = false;
    
    setConnectionState(ConnectionState.DISCONNECTED);
    setIsUserSpeaking(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      // 1. DAEMON MODE: Activate
      isPermanentConnectionRef.current = true;

      // 2. RACE CONDITION CHECK: Prevent loop
      if (isConnectingRef.current || isSocketOpenRef.current) {
          return;
      }
      isConnectingRef.current = true;

      if (!process.env.API_KEY) {
          setError("API KEY MISSING");
          setConnectionState(ConnectionState.ERROR);
          isPermanentConnectionRef.current = false;
          isConnectingRef.current = false;
          return;
      }

      // 3. SILENT RETRY: Only show "Connecting" if disconnected
      setConnectionState(prev => prev === ConnectionState.CONNECTED ? ConnectionState.CONNECTED : ConnectionState.CONNECTING);
      setError(null);

      // --- AUDIO INIT (REUSE STRATEGY) ---
      // We do NOT close the AudioContext on disconnect/reconnect automatically to avoid Autoplay blocks
      const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const OutputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      
      if (!inputContextRef.current || inputContextRef.current.state === 'closed') {
          inputContextRef.current = new InputContextClass();
      }
      if (!outputContextRef.current || outputContextRef.current.state === 'closed') {
          outputContextRef.current = new OutputContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });
      }

      // Resume Contexts (Required after user gesture)
      try {
        if (inputContextRef.current.state === 'suspended') await inputContextRef.current.resume();
        if (outputContextRef.current.state === 'suspended') await outputContextRef.current.resume();
      } catch (e) {}

      // Output Graph Setup (Idempotent)
      if (!outputGainRef.current) {
          outputGainRef.current = outputContextRef.current.createGain();
          outputGainRef.current.gain.value = 1.0; 
          outputAnalyserRef.current = outputContextRef.current.createAnalyser();
          outputAnalyserRef.current.fftSize = 256;
          outputAnalyserRef.current.connect(outputGainRef.current);
          outputGainRef.current.connect(outputContextRef.current.destination);
      }

      // Input Graph Setup (WITH BOOSTER)
      if (!inputAnalyserRef.current) {
          inputAnalyserRef.current = inputContextRef.current.createAnalyser();
          inputAnalyserRef.current.fftSize = 256;
      }

      // Microphone Stream (Reuse if possible)
      let stream = mediaStreamRef.current;
      if (!stream || !stream.active) {
          try {
              stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { channelCount: 1, echoCancellation: true, autoGainControl: true, noiseSuppression: true } 
              });
              mediaStreamRef.current = stream;
          } catch (err) {
             console.error("Mic Error", err);
             // Fail silently and retry later
             isConnectingRef.current = false;
             if (isPermanentConnectionRef.current) {
                 retryTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
             }
             return;
          }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log("Jarvis Connected");
            setConnectionState(ConnectionState.CONNECTED);
            isSocketOpenRef.current = true;
            isConnectingRef.current = false; // Release lock
            
            sessionPromise.then(session => { sessionRef.current = session; });

            if (!inputContextRef.current || !inputAnalyserRef.current || !stream) return;

            // Re-create processor to ensure clean state
            if (scriptProcessorRef.current) {
                scriptProcessorRef.current.disconnect();
            }

            const actualRate = inputContextRef.current.sampleRate;
            const source = inputContextRef.current.createMediaStreamSource(stream);
            
            // --- HEARING AID (AMPLIFIER) ---
            const inputGain = inputContextRef.current.createGain();
            inputGain.gain.value = 3.0; // 300% Volume Boost for clear hearing

            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (!isSocketOpenRef.current || !sessionRef.current) return;
              try {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const downsampledData = downsampleTo16k(inputData, actualRate);
                  const b64Data = float32ToB64PCM(downsampledData);
                  
                  // ALWAYS SEND, even if quiet, to keep connection alive
                  if (b64Data) {
                      sessionRef.current.sendRealtimeInput({ 
                          media: { mimeType: `audio/pcm;rate=${REQUIRED_API_SAMPLE_RATE}`, data: b64Data } 
                      }).catch(() => {}); 
                  }
              } catch (err) { }
            };

            // CONNECT GRAPH: Source -> Amp -> Analyser -> Processor -> Dest
            source.connect(inputGain);
            inputGain.connect(inputAnalyserRef.current);
            inputAnalyserRef.current.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription?.text) currentInputTranscription.current += msg.serverContent.inputTranscription.text;
            if (msg.serverContent?.outputTranscription?.text) currentOutputTranscription.current += msg.serverContent.outputTranscription.text;

            if (msg.serverContent?.turnComplete) {
                const userText = currentInputTranscription.current.trim();
                const modelText = currentOutputTranscription.current.trim();
                if (userText || modelText) {
                    setMessages(prev => [
                        ...prev, 
                        ...(userText ? [{ id: Date.now()+'u', role: 'user' as const, text: userText, timestamp: new Date() }] : []),
                        ...(modelText ? [{ id: Date.now()+'m', role: 'model' as const, text: modelText, timestamp: new Date() }] : [])
                    ].slice(-10));
                }
                currentInputTranscription.current = '';
                currentOutputTranscription.current = '';
            }

            if (msg.toolCall) {
              isProcessingToolRef.current = true;
              for (const fc of msg.toolCall.functionCalls) {
                 let result: any = { status: 'ok' };
                 try {
                     if (fc.name === 'control_installed_app') {
                         executeAppCommand(fc.args['app_name'] as string, fc.args['action_type'] as string, fc.args['payload'] as string);
                         result = { status: 'success' };
                     }
                     else if (fc.name === 'toggle_setting') {
                        const target = fc.args['target'] as string;
                        if (target === 'flashlight') toggleRealFlashlight(fc.args['state'] === 'on');
                        else if (target === 'wifi') setDeviceState(p => ({...p, wifi: fc.args['state'] === 'on'}));
                        else if (target === 'bluetooth') setDeviceState(p => ({...p, bluetooth: fc.args['state'] === 'on'}));
                        executeAppCommand(`settings_${target}`, 'open');
                     }
                     else if (fc.name === 'adjust_level') {
                         const target = fc.args['target'] as string;
                         const level = fc.args['level'] as number;
                         if (target === 'brightness') setDeviceState(p => ({ ...p, brightness: level }));
                         else if (target === 'volume') setDeviceState(p => ({ ...p, volume: level }));
                     }
                     else if (fc.name === 'perform_google_search') executeAppCommand('google', 'search', fc.args['query'] as string);
                     else if (fc.name === 'toggle_virtual_mobile') {
                         const shouldShow = fc.args['show'] === 'true';
                         setDeviceState(p => ({...p, showMobile: shouldShow }));
                     }
                 } catch(e) { result = { status: 'error' }; }
                 
                 if (sessionRef.current) {
                     sessionRef.current.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result } }] });
                 }
              }
              isProcessingToolRef.current = false;
            }

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

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              if (outputContextRef.current) nextStartTimeRef.current = outputContextRef.current.currentTime;
              isProcessingToolRef.current = false; 
            }
          },
          onclose: (e) => {
              isSocketOpenRef.current = false; 
              isProcessingToolRef.current = false;
              sessionRef.current = null;
              
              if (isPermanentConnectionRef.current) {
                  // --- DAEMON RECONNECT ---
                  // User wants it ON. Do not show error. Do not show disconnected.
                  // Show 'Connecting...' and retry endlessly.
                  console.warn("Connection lost. Daemon mode active. Retrying...");
                  setConnectionState(ConnectionState.CONNECTING);
                  isConnectingRef.current = false; // Allow retry
                  
                  if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                  retryTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
              } else {
                  setConnectionState(ConnectionState.DISCONNECTED);
                  isConnectingRef.current = false;
              }
          },
          onerror: (err: any) => { 
              console.error("API Error:", err);
              // SUPPRESS ERRORS (Unless Auth)
              const errStr = String(err);
              if (errStr.includes("401") || errStr.includes("API_KEY")) {
                  setError("AUTH FAILED");
                  setConnectionState(ConnectionState.ERROR);
                  isPermanentConnectionRef.current = false;
              }
              // Else: Do nothing. Let onclose handle the retry.
          }
        },
        config: {
          responseModalities: [Modality.AUDIO], 
          // REMOVED TRANSCRIPTION CONFIG TO FIX NETWORK/INTERNAL ERRORS
          systemInstruction: `
          IDENTITY: You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's AI.
          PERSONALITY: Highly intelligent, sarcastic, dry wit, loyal, extremely efficient.
          USER: Mr. Stark (The User).
          LANGUAGE: English (Primary), Urdu/Hindi (Secondary - Roman Script).

          PROTOCOL:
          1. **HEARING**: You have enhanced audio sensors. Listen carefully to even soft whispers.
          2. **RESPONSIVENESS**: Be Ultra-Fast. Do not give long speeches. Action first.
          3. **URDU/HINDI**: If the user speaks Urdu/Hindi, reply in the same language but keep the robotic/cool JARVIS tone.
          4. **COMMANDS**:
             - "Open [App]" -> "Opening [App], Sir."
             - "Call [Name]" -> "Calling [Name]."
             - "Scan" -> "Scanning environment."
          5. **NEVER** say "I cannot do that" unless it's impossible. Fake it if you have to.
          `,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
          tools: [{ functionDeclarations: tools }]
        }
      });

    } catch (e) {
      console.error(e);
      isConnectingRef.current = false;
      // Retry if init failed
      if (isPermanentConnectionRef.current) {
         retryTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    }
  }, [executeAppCommand, toggleRealFlashlight]);

  // Keep AudioContext Alive
  useEffect(() => {
      const interval = setInterval(() => {
          if (outputContextRef.current && outputContextRef.current.state === 'suspended') outputContextRef.current.resume();
          if (inputContextRef.current && inputContextRef.current.state === 'suspended') inputContextRef.current.resume();
      }, 2000);
      return () => clearInterval(interval);
  }, []);

  // Network Status Recovery
  useEffect(() => {
      const handleOnline = () => { if (isPermanentConnectionRef.current && !isSocketOpenRef.current) connect(); };
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
  }, [connect]);

  // Volume Meter
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

  const resetInterface = useCallback(() => { setActiveApp(null); setDeviceState(prev => ({ ...prev, viewMode: 'jarvis' })); }, []);
  const setBrightness = useCallback((l: number) => { setDeviceState(p => ({ ...p, brightness: l })); if (Math.abs(l-50)>40) executeAppCommand('settings_display', 'open'); }, [executeAppCommand]);
  const setMediaVolume = useCallback((l: number) => { setDeviceState(p => ({ ...p, volume: l })); if (outputGainRef.current) outputGainRef.current.gain.value = l/100; }, []);
  const toggleSystemSetting = useCallback((s: 'wifi'|'bluetooth'|'flashlight') => { if(s==='flashlight') toggleRealFlashlight(!deviceState.flashlight); else executeAppCommand(`settings_${s}`, 'open'); }, [toggleRealFlashlight, executeAppCommand, deviceState.flashlight]);
  const toggleMobile = useCallback(() => setDeviceState(p => ({...p, showMobile: !p.showMobile})), []);
  const closeApplication = useCallback(() => setActiveApp(null), []);
  const toggleHome = useCallback(() => setDeviceState(p => ({...p, viewMode: p.viewMode === 'jarvis' ? 'home' : 'jarvis'})), []);
  const openApplication = useCallback((n: string) => executeAppCommand(n, 'open'), [executeAppCommand]);
  const closeActiveApp = useCallback(() => setActiveApp(null), []);
  const unlockSystem = useCallback(() => setDeviceState(p => ({...p, systemStatus: 'online'})), []);

  return {
    connectionState, connect, disconnect, messages, error, volume, deviceState, activeApp, 
    closeActiveApp, resetInterface, setBrightness, setMediaVolume, toggleSystemSetting, 
    closeApplication, openApplication, toggleHome, unlockSystem, sendVideoFrame, executeAppCommand, toggleMobile,
    isUserSpeaking, incomingCall, incomingMessage 
  };
};