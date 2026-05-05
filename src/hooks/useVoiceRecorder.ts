import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setRecordingDuration(0);
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        clearInterval(timerRef.current);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        setIsRecording(false);
        clearInterval(timerRef.current);
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  };

  const uploadAudio = async (blob: Blob, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  return { isRecording, recordingDuration, startRecording, stopRecording, uploadAudio };
}
