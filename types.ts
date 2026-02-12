
export interface Message {
  id: string;
  role: 'user' | 'model' | 'system' | 'thought'; 
  text: string;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  OFFLINE_READY = 'offline_ready', 
}

export type AIProvider = 'gemini' | 'ollama';

export interface AudioVisualizerState {
  volume: number; 
  isSpeaking: boolean;
}

export interface DeviceState {
  batteryLevel: number | null;
  isCharging: boolean;
  wifi: boolean;
  bluetooth: boolean;
  flashlight: boolean;
  location: string | null;
  brightness: number;
  volume: number;
  viewMode: 'jarvis' | 'home';
  showMobile: boolean; 
  systemStatus: 'online' | 'locked' | 'shutdown';
  // REMOVED FAKE MODES (Suit, Flight, Element, Sentry)
  simulationMode: 'none' | 'scanning' | 'hacking' | 'analysis' | 'database';
  aiProvider: AIProvider; 
  wakeLockActive: boolean; 
}

export interface IncomingCall {
    id: string;
    name: string;
    number: string;
    avatar?: string;
    status: 'ringing' | 'connected' | 'ended';
}

export interface IncomingMessage {
    id: string;
    sender: string;
    content: string;
    app: string;
    timestamp: Date;
}

export interface NotificationItem {
    id: string;
    app: string;
    title: string;
    text: string;
    timestamp: number;
}

// --- GLOBAL WINDOW EXTENSION FOR ANDROID BRIDGE ---
declare global {
  interface Window {
    JarvisBridge?: {
      toggleSystemSetting: (setting: string, state: boolean) => void;
      launchApp: (packageName: string, action: string, payload: string) => void;
      performAction: (action: string) => void;
      controlMedia: (command: string) => void;
      lockNow: () => void;
      acquireWakeLock: () => void;
      releaseWakeLock: () => void;
    };
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}
