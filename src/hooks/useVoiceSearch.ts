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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    const recognition = new SpeechRecognition();
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
  }, [currentLang, onResult]);

  return { isListening, startListening, currentLang, setCurrentLang };
}
