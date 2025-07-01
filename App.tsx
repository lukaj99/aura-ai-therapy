
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Message, Role, SessionStatus } from './types';
import { getEnhancedGeminiService } from './services/enhancedGeminiService';
import { ErrorService, ErrorType, ErrorSeverity, AppError } from './services/errorService';
import type { Chat } from '@google/genai';
import Transcript from './components/Transcript';
import StatusIndicator from './components/StatusIndicator';
import VoiceSelector from './components/VoiceSelector';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorNotification from './components/ErrorNotification';

// --- Type definitions for Web Speech API to satisfy TypeScript compiler ---
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  
  start(): void;
  stop(): void;
  
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onstart: () => void;
  onend: () => void;
}

// Use a type assertion to access non-standard window properties
const SpeechRecognition: SpeechRecognitionStatic | undefined = 
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male');
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use a ref to hold the current status to avoid stale closures in event handlers
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const chatRef = useRef<Chat | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingAudioRef = useRef<boolean>(false);
  const currentlyPlayingAudioRef = useRef<HTMLAudioElement | null>(null);
  const geminiServiceRef = useRef(getEnhancedGeminiService());
  const errorServiceRef = useRef(ErrorService.getInstance());


  useEffect(() => {
    const initializeService = async () => {
      try {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('API key not found in environment variables');
        }

        await geminiServiceRef.current.initialize(apiKey);
        chatRef.current = await geminiServiceRef.current.startChatSession();
        
        setIsInitialized(true);
        setMessages([{
          id: 'initial-greeting',
          role: Role.AI,
          text: "Hello, I'm Aura. I'm here to listen. What's on your mind today?",
          timestamp: new Date().toISOString(),
        }]);
      } catch (error) {
        const appError = errorServiceRef.current.createError({
          type: ErrorType.INITIALIZATION,
          severity: ErrorSeverity.CRITICAL,
          message: 'Failed to initialize therapy session',
          originalError: error instanceof Error ? error : new Error(String(error)),
          context: { hasApiKey: !!(process.env.API_KEY || process.env.GEMINI_API_KEY) }
        });
        
        errorServiceRef.current.handleError(appError);
        setCurrentError(appError);
        setStatus(SessionStatus.ERROR);
        
        setMessages([{
          id: 'init-error',
          role: Role.AI,
          text: appError.userMessage,
          timestamp: new Date().toISOString(),
        }]);
      }
    };

    initializeService();
  }, []);

  const playNextAudioInQueue = useCallback(() => {
    if (audioQueueRef.current.length > 0) {
        isPlayingAudioRef.current = true;
        const audio = audioQueueRef.current.shift();
        currentlyPlayingAudioRef.current = audio || null;
        if (audio) {
            audio.play().catch(e => {
                const audioError = errorServiceRef.current.createError({
                  type: ErrorType.AUDIO,
                  severity: ErrorSeverity.LOW,
                  message: 'Audio playback failed',
                  originalError: e instanceof Error ? e : new Error(String(e)),
                  context: { queueLength: audioQueueRef.current.length }
                });
                errorServiceRef.current.handleError(audioError);
                setCurrentError(audioError);
                
                isPlayingAudioRef.current = false;
                currentlyPlayingAudioRef.current = null;
                playNextAudioInQueue(); // Try next audio in queue
            });
            audio.onended = () => {
                isPlayingAudioRef.current = false;
                currentlyPlayingAudioRef.current = null;
                playNextAudioInQueue();
            };
            audio.onerror = (e) => {
                const audioError = errorServiceRef.current.createError({
                  type: ErrorType.AUDIO,
                  severity: ErrorSeverity.MEDIUM,
                  message: 'Audio error during playback',
                  originalError: e instanceof Error ? e : new Error('Audio error'),
                  context: { queueLength: audioQueueRef.current.length }
                });
                errorServiceRef.current.handleError(audioError);
                setCurrentError(audioError);
                
                isPlayingAudioRef.current = false;
                currentlyPlayingAudioRef.current = null;
                playNextAudioInQueue(); // Try next audio in queue
            };
        }
    } else {
        isPlayingAudioRef.current = false;
        currentlyPlayingAudioRef.current = null;
        // Only transition to listening if the session is currently in the speaking phase.
        // This prevents race conditions if the user stops the session manually.
        if (statusRef.current === SessionStatus.SPEAKING) {
          setStatus(SessionStatus.LISTENING);
        }
    }
  }, []);

  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim() || !chatRef.current) return;
    
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: Role.USER, text: transcript, timestamp: new Date().toISOString() }]);
    setStatus(SessionStatus.THINKING);

    // Stop and clear any audio from a previous turn
    if (currentlyPlayingAudioRef.current) {
        currentlyPlayingAudioRef.current.pause();
    }
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    currentlyPlayingAudioRef.current = null;

    const aiMessageId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: aiMessageId, role: Role.AI, text: '...', timestamp: new Date().toISOString() }]);

    try {
        // Prepend the voice gender context to the message for the AI
        const messageWithContext = `[Aura's voice is set to: ${voiceGender}] ${transcript}`;
        const stream = geminiServiceRef.current.sendMessageStream(messageWithContext);
        
        let accumulatedText = "";
        
        for await (const chunk of stream) {
            if (chunk.done) break;
            
            if (chunk.text) {
                accumulatedText += chunk.text;
                setMessages(prev => 
                    prev.map(msg => msg.id === aiMessageId ? { ...msg, text: accumulatedText || '...' } : msg)
                );
            }

            if (chunk.audio) {
                try {
                    const audioBlob = new Blob([chunk.audio], { type: 'audio/pcm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    audioQueueRef.current.push(audio);
                } catch (audioError) {
                    const error = errorServiceRef.current.createError({
                      type: ErrorType.AUDIO,
                      severity: ErrorSeverity.LOW,
                      message: 'Failed to process audio chunk',
                      originalError: audioError instanceof Error ? audioError : new Error(String(audioError))
                    });
                    errorServiceRef.current.handleError(error);
                }
            }
        }
        
        setStatus(SessionStatus.SPEAKING);
        if (!isPlayingAudioRef.current) {
            playNextAudioInQueue();
        }

    } catch (error) {
        const appError = errorServiceRef.current.createError({
          type: ErrorType.API,
          severity: ErrorSeverity.HIGH,
          message: 'Failed to process conversation',
          originalError: error instanceof Error ? error : new Error(String(error)),
          context: { transcriptLength: transcript.length, voiceGender }
        });
        
        errorServiceRef.current.handleError(appError);
        setCurrentError(appError);
        setStatus(SessionStatus.ERROR);
        
        setMessages(prev => 
            prev.map(msg => msg.id === aiMessageId ? { ...msg, text: appError.userMessage } : msg)
        );
    }
  }, [playNextAudioInQueue, voiceGender]);

  useEffect(() => {
    if (status === SessionStatus.LISTENING) {
      if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
        } catch(e) {
            console.warn("Could not start speech recognition (it might already be running).", e);
        }
      }
    } else {
       if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [status]);


  const handleSessionToggle = useCallback(() => {
    if (!SpeechRecognition) {
      const speechError = errorServiceRef.current.createError({
        type: ErrorType.SPEECH_RECOGNITION,
        severity: ErrorSeverity.CRITICAL,
        message: 'Speech recognition not supported',
        context: { userAgent: navigator.userAgent }
      });
      
      errorServiceRef.current.handleError(speechError);
      setCurrentError(speechError);
      setStatus(SessionStatus.ERROR);
      return;
    }

    if (!isInitialized) {
      const initError = errorServiceRef.current.createError({
        type: ErrorType.INITIALIZATION,
        severity: ErrorSeverity.HIGH,
        message: 'Service not ready',
        context: { isInitialized }
      });
      
      errorServiceRef.current.handleError(initError);
      setCurrentError(initError);
      return;
    }

    if (status === SessionStatus.IDLE || status === SessionStatus.ERROR) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
          console.log('Speech recognition started.');
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        console.log('Transcript received:', transcript);
        processTranscript(transcript);
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        const speechError = errorServiceRef.current.createError({
          type: ErrorType.SPEECH_RECOGNITION,
          severity: ErrorSeverity.MEDIUM,
          message: `Speech recognition error: ${event.error}`,
          context: { errorType: event.error, message: event.message }
        });
        
        errorServiceRef.current.handleError(speechError);
        setCurrentError(speechError);
        setStatus(SessionStatus.ERROR);
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended.');
         if (statusRef.current === SessionStatus.LISTENING) {
            try {
                recognitionRef.current?.start();
            } catch (e) {
                const speechError = errorServiceRef.current.createError({
                  type: ErrorType.SPEECH_RECOGNITION,
                  severity: ErrorSeverity.HIGH,
                  message: 'Failed to restart speech recognition',
                  originalError: e instanceof Error ? e : new Error(String(e))
                });
                
                errorServiceRef.current.handleError(speechError);
                setCurrentError(speechError);
                setStatus(SessionStatus.ERROR);
            }
         }
      };

      setStatus(SessionStatus.LISTENING);

    } else {
      // Stop speech recognition
      if(recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      
      // Stop any browser TTS fallback
      speechSynthesis.cancel();
      
      // Stop and clear custom audio queue
      if (currentlyPlayingAudioRef.current) {
          currentlyPlayingAudioRef.current.pause();
          currentlyPlayingAudioRef.current.src = ""; // Release resources
          currentlyPlayingAudioRef.current = null;
      }
      audioQueueRef.current = [];
      isPlayingAudioRef.current = false;

      setStatus(SessionStatus.IDLE);
    }
  }, [status, processTranscript]);

  const handleErrorDismiss = useCallback(() => {
    setCurrentError(null);
  }, []);

  const handleErrorRetry = useCallback(() => {
    if (currentError?.type === ErrorType.INITIALIZATION) {
      window.location.reload();
    } else if (currentError?.type === ErrorType.API) {
      // Reset and try again
      setStatus(SessionStatus.IDLE);
      setCurrentError(null);
    } else {
      setCurrentError(null);
    }
  }, [currentError]);

  const handleErrorBoundaryError = useCallback((error: Error) => {
    const boundaryError = errorServiceRef.current.createError({
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.CRITICAL,
      message: 'Application error boundary triggered',
      originalError: error
    });
    
    errorServiceRef.current.handleError(boundaryError);
  }, []);

  return (
    <ErrorBoundary onError={handleErrorBoundaryError}>
      <main className="dark:bg-gradient-to-br from-slate-900 to-blue-950 text-white min-h-screen flex flex-col items-center justify-center font-sans">
        <div className="w-full h-full flex flex-col items-center justify-between p-4 sm:p-6">
          <header className="text-center mb-4">
            <h1 className="text-4xl font-bold text-slate-100">Aura</h1>
            <p className="text-lg text-slate-300">Your AI therapy companion</p>
          </header>
          <Transcript messages={messages} />
          <footer className="w-full flex flex-col items-center justify-center py-4 space-y-6">
            {status === SessionStatus.IDLE && isInitialized && (
              <VoiceSelector selectedVoice={voiceGender} onVoiceChange={setVoiceGender} />
            )}
            <StatusIndicator status={status} onClick={handleSessionToggle} />
          </footer>
        </div>
        
        <ErrorNotification
          error={currentError}
          onDismiss={handleErrorDismiss}
          onRetry={currentError?.retryable ? handleErrorRetry : undefined}
          autoHideDuration={5000}
        />
      </main>
    </ErrorBoundary>
  );
};

export default App;
