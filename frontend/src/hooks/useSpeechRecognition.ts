import { useState, useEffect, useRef } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Spraakherkenning wordt niet ondersteund in deze browser. Gebruik Chrome of Edge.');
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'nl-NL'; // Dutch language

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript((prev) => {
        // Remove the last interim result and add the new one
        const cleaned = prev.replace(/\s*\[.*?\]\s*$/, '');
        return cleaned + (finalTranscript || `[${interimTranscript}]`);
      });
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      let errorMessage = 'Er is een fout opgetreden bij spraakherkenning.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Geen spraak gedetecteerd. Probeer het opnieuw.';
          break;
        case 'audio-capture':
          errorMessage = 'Geen microfoon gevonden. Controleer je microfoon instellingen.';
          break;
        case 'not-allowed':
          errorMessage = 'Microfoon toegang geweigerd. Geef toegang in je browser instellingen.';
          break;
        case 'network':
          errorMessage = 'Netwerk fout. Controleer je internet verbinding.';
          break;
        default:
          errorMessage = `Fout: ${event.error}`;
      }
      
      setError(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Clean up interim results
      setTranscript((prev) => prev.replace(/\s*\[.*?\]\s*$/, ''));
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (!isSupported || !recognitionRef.current) {
      setError('Spraakherkenning is niet beschikbaar.');
      return;
    }

    try {
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      setError('Kon niet starten met luisteren. Probeer het opnieuw.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setError(null);
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  };
}

