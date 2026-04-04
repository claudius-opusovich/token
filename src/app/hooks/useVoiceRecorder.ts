import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceRecordingResult = {
  blob: Blob;
  duration: number; // milliseconds
};

export type VoiceRecorderState = {
  isRecording: boolean;
  duration: number; // seconds (for display)
  analyser: AnalyserNode | null;
};

const PREFERRED_MIME_TYPES = [
  'audio/ogg; codecs=opus',
  'audio/webm; codecs=opus',
  'audio/webm',
  'audio/mp4',
];

function getSupportedMimeType(): string {
  for (const mime of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    duration: 0,
    analyser: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<((result: VoiceRecordingResult) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    resolveRef.current = null;
    setState({ isRecording: false, duration: 0, analyser: null });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Set up AnalyserNode for waveform visualization
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const durationMs = Date.now() - startTimeRef.current;
        if (resolveRef.current) {
          resolveRef.current({ blob, duration: durationMs });
        }
        cleanup();
      };

      startTimeRef.current = Date.now();
      recorder.start(100); // collect data every 100ms

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState((prev) => ({ ...prev, duration: elapsed }));
      }, 100);

      setState({ isRecording: true, duration: 0, analyser });
    } catch (err) {
      console.error('Voice recording failed:', err);
      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<VoiceRecordingResult> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanup();
        resolve({ blob: new Blob(), duration: 0 });
        return;
      }
      resolveRef.current = resolve;
      recorder.stop();
    });
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      // Remove onstop handler to prevent sending
      recorder.onstop = null;
      recorder.stop();
    }
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
