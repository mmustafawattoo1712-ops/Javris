// Converts base64 string to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Converts Float32Array (Web Audio API default) to Int16Array (PCM) and then to Base64
// This is used for sending microphone data to Gemini
export function float32ToB64PCM(float32Array: Float32Array): string {
  const len = float32Array.length;
  // Ensure we have data
  if (len === 0) return '';
  
  const int16Array = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    // Clamp values to -1 to 1 and scale to Int16 range
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16Array.buffer);
  const bytesLen = bytes.byteLength;
  for (let i = 0; i < bytesLen; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decodes raw PCM byte array to AudioBuffer
export function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Robust linear interpolation downsampler
export function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === 16000) return input;
  if (inputRate < 16000) return input; // Should not happen typically, but fail-safe

  const ratio = inputRate / 16000;
  const newLength = Math.floor(input.length / ratio);
  
  if (newLength <= 0) return new Float32Array(0);

  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const index = i * ratio;
    const low = Math.floor(index);
    const high = Math.ceil(index);
    const weight = index - low;
    
    // Safety check for out of bounds
    const val1 = input[low] !== undefined ? input[low] : 0;
    const val2 = input[high] !== undefined ? input[high] : val1; 
    
    result[i] = val1 * (1 - weight) + val2 * weight;
  }
  return result;
}