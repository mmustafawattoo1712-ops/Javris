import { useState, useEffect, useRef, useCallback } from 'react';

export const useWakeWord = (onWake: () => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Set language to Urdu (Pakistan) but this might vary by device support
    recognition.lang = 'ur-PK'; 

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const transcript = results
        .map((result: any) => result[0].transcript)
        .join('')
        .toLowerCase();

      // console.log("Wake Word Debug:", transcript);

      // Check for keywords: Jarvis, System, Activate, Hello, Urdu phrases
      // Added more variations for phonetic matches in Urdu/English mix
      if (
          transcript.includes('jarvis') || 
          transcript.includes('service') || 
          transcript.includes('javed') || // Common misinterpretation
          transcript.includes('janis') || 
          transcript.includes('activate') ||
          transcript.includes('on karo') ||
          transcript.includes('start') ||
          transcript.includes('shuru karo') ||
          transcript.includes('suno') ||
          transcript.includes('hello') ||
          transcript.includes('online')
      ) {
        recognition.stop();
        onWake();
      }
    };

    recognition.onend = () => {
      // Auto-restart if we are supposed to be listening
      if (recognitionRef.current && !recognitionRef.current.stoppedManually) {
          try {
            recognitionRef.current.start();
          } catch (e) {
              // Ignore start errors
          }
      }
    };

    recognitionRef.current = recognition;
  }, [onWake]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        recognitionRef.current.stoppedManually = false;
        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch(e) {
            // Already started
        }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        recognitionRef.current.stoppedManually = true;
        recognitionRef.current.stop();
        setIsListening(false);
    }
  }, []);

  return { isListening, startListening, stopListening };
};