import { useCallback, useEffect, useRef, useState } from 'react';
export function useVoiceCapture() {
    const recognitionRef = useRef(null);
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    useEffect(() => {
        const globalWindow = window;
        const Recognition = globalWindow.SpeechRecognition || globalWindow.webkitSpeechRecognition;
        if (Recognition) {
            setSupported(true);
            const recognition = new Recognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                setTranscript((prev) => `${prev} ${text}`.trim());
            };
            recognition.onend = () => setListening(false);
            recognitionRef.current = recognition;
        }
    }, []);
    const start = useCallback(() => {
        if (!recognitionRef.current)
            return;
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
    };
}
//# sourceMappingURL=useVoiceCapture.js.map