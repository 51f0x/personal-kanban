import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionResult = {
    transcript: string;
};

type RecognitionAlternativeList = {
    [index: number]: RecognitionResult;
    length: number;
};

type RecognitionResultList = {
    [index: number]: RecognitionAlternativeList;
    length: number;
};

interface RecognitionEvent {
    results: RecognitionResultList;
}

type RecognitionInstance = {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    onresult: ((event: RecognitionEvent) => void) | null;
    onend: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionInstance;

export function useVoiceCapture() {
    const recognitionRef = useRef<RecognitionInstance | null>(null);
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');

    useEffect(() => {
        const globalWindow = window as typeof window & {
            SpeechRecognition?: RecognitionConstructor;
            webkitSpeechRecognition?: RecognitionConstructor;
        };

        const Recognition = globalWindow.SpeechRecognition || globalWindow.webkitSpeechRecognition;
        if (Recognition) {
            setSupported(true);
            const recognition = new Recognition() as unknown as RecognitionInstance;
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onresult = (event: RecognitionEvent) => {
                const text = event.results[0][0].transcript;
                setTranscript((prev) => `${prev} ${text}`.trim());
            };
            recognition.onend = () => setListening(false);
            recognitionRef.current = recognition;
        }
    }, []);

    const start = useCallback(() => {
        if (!recognitionRef.current) return;
        setTranscript('');
        recognitionRef.current.start();
        setListening(true);
    }, []);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    const reset = useCallback(() => setTranscript(''), []);

    return {
        supported,
        listening,
        transcript,
        start,
        stop,
        reset,
    } as const;
}
