"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

function getRecognition(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Voice input (SpeechRecognition) + output (speechSynthesis) with graceful
 * degradation: `supported` flags let the UI fall back to text.
 */
export function useSpeech(opts?: {
  onFinalResult?: (transcript: string) => void;
  lang?: string;
}) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const onFinalRef = useRef(opts?.onFinalResult);
  onFinalRef.current = opts?.onFinalResult;

  useEffect(() => {
    setSttSupported(
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) return;
    recognitionRef.current?.abort();
    recognitionRef.current = recognition;
    recognition.lang = opts?.lang ?? "en-AU";
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterim(interimText || finalTranscript);
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalTranscript.trim();
      if (text) onFinalRef.current?.(text);
    };
    recognition.onerror = () => {
      setListening(false);
      setInterim("");
    };
    setListening(true);
    recognition.start();
  }, [opts?.lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!("speechSynthesis" in window)) {
        onDone?.();
        return;
      }
      window.speechSynthesis.cancel();
      const cleaned = text
        .replace(/\[PHASE:[A-Z]+\]/g, "")
        .replace(/[*#_`>-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = opts?.lang ?? "en-AU";
      utterance.rate = 1.05;
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith("en-AU") || v.lang.startsWith("en-GB"));
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        setSpeaking(false);
        onDone?.();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        onDone?.();
      };
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [opts?.lang]
  );

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return {
    listening,
    speaking,
    interim,
    sttSupported,
    ttsSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
