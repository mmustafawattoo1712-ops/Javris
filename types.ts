
export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

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
  showMobile: boolean; // New state for Virtual Android
  systemStatus: 'online' | 'locked' | 'shutdown';
  simulationMode: 'none' | 'scanning' | 'hacking' | 'analysis' | 'satellite' | 'suit' | 'sentry' | 'element' | 'flight' | 'database';
}

// --- NEW TYPES FOR CALLS & MESSAGES ---
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
    app: string; // Changed from enum to string to support ALL real apps
    timestamp: Date;
}

export interface NotificationItem {
    id: string;
    app: string;
    title: string;
    text: string;
    timestamp: number;
}
