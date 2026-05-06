import { useState, useCallback } from 'react';

export type VoiceLanguage = 'en-US' | 'ta-IN' | 'ml-IN' | 'hi-IN' | 'ur-PK';

export const VOICE_LANGUAGES: { label: string; code: VoiceLanguage }[] = [
  { label: 'English', code: 'en-US' },
  { label: 'Hindi', code: 'hi-IN' },
  { label: 'Tamil', code: 'ta-IN' },
  { label: 'Malayalam', code: 'ml-IN' },
  { label: 'Urdu', code: 'ur-PK' },
];

export function useVoiceSearch(onResult: (transcript: string) => void, initialLang: VoiceLanguage = 'en-US') {
  const [isListening, setIsListening] = useState(false);
  const [currentLang, setCurrentLang] = useState<VoiceLanguage>(initialLang);

  const startListening = useCallback(() => {
    let recognition: any;
    try {
      const RecognitionConstructor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      
      if (!RecognitionConstructor || typeof RecognitionConstructor !== 'function') {
        console.warn('[VoiceSearch] SpeechRecognition not supported or restricted.');
        alert('Speech recognition is not supported in your browser or is restricted in this view.');
        return;
      }

      try {
        recognition = new (RecognitionConstructor as any)();
      } catch (err: any) {
        console.error('[VoiceSearch] Failed to instantiate SpeechRecognition:', err);
        if (err.message?.includes('constructor') || err.name === 'TypeError') {
          console.info('[VoiceSearch] Speech Recognition constructor is restricted in this context.');
          alert('Speech Recognition is restricted in this view. Please open the app in a new tab.');
        }
        setIsListening(false);
        return;
      }
      
      recognition.lang = currentLang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition failed to initialize', err);
      setIsListening(false);
    }
  }, [currentLang, onResult]);

  return { isListening, startListening, currentLang, setCurrentLang };
}
