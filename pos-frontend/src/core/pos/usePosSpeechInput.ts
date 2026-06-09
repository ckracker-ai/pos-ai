'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void)
    | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speechErrorMessage(code?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permiso de micrófono denegado. Actívalo en el navegador.';
    case 'no-speech':
      return 'No escuché nada. Intenta de nuevo, más cerca del micrófono.';
    case 'audio-capture':
      return 'No se detectó micrófono en este dispositivo.';
    case 'network':
      return 'La voz necesita conexión. Revisa red o escribe el comando.';
    case 'aborted':
      return '';
    default:
      return code ? `Error de voz (${code}). Escribe el comando.` : 'No se pudo usar el micrófono.';
  }
}

export function usePosSpeechInput(onResult: (transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() != null);
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const toggleListen = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    setSpeechError(null);

    const recognition = new Ctor();
    recognition.lang = 'es-CL';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setLastHeard(transcript);
        onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      const msg = speechErrorMessage(event.error);
      if (msg) setSpeechError(msg);
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setSpeechError('No se pudo iniciar el micrófono. Prueba Chrome o escribe el comando.');
      setListening(false);
    }
  }, [listening, onResult]);

  return { listening, supported, lastHeard, speechError, toggleListen };
}
