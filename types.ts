
export interface Message {
  id: string;
  role: 'user' | 'model' | 'system' | 'thought'; // Added 'thought' for reasoning logs
  text: string;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  OFFLINE_READY = 'offline_ready', // New state for Local LLM
}

export type AIProvider = 'gemini' | 'ollama';

export interface AudioVisualizerState {
  volume: number; // 0 to 1
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
  simulationMode: 'none' | 'scanning' | 'hacking' | 'analysis' | 'satellite' | 'suit' | 'sentry' | 'element' | 'flight' | 'database';
  aiProvider: AIProvider; // Track which brain is active
  isDeviceAdmin: boolean; // Is Device Admin Active?
  showAdminModal: boolean; // Show the permission request screen?
  wakeLockActive: boolean; // Is Wake Lock held?
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