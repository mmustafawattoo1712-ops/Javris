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
}