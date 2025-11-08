"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VoiceTranslation() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [realtimeTranslation, setRealtimeTranslation] = useState('');
  const [status, setStatus] = useState('Disconnected');
  
  const [languages, setLanguages] = useState<Array<{code: string, name: string}>>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [targetLang, setTargetLang] = useState('es');
  const [sourceLang, setSourceLang] = useState('auto');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Array<{type: string, text: string}>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const colors = {
      success: 'bg-green-100 text-green-800 border-green-300',
      error: 'bg-red-100 text-red-800 border-red-300',
      info: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    
    setMessages(prev => [...prev, { type, text: message }]);
    setTimeout(() => {
      setMessages(prev => prev.slice(1));
    }, 3000);
  };

  const connectWebSocket = useCallback(() => {
    console.log('🔌 Attempting to connect to WebSocket...');
    
    const websocket = new WebSocket('ws://localhost:8000/v1/translate/audio/realtime');
    
    websocket.onopen = () => {
      console.log('✅ WebSocket connected');
      setWsConnected(true);
      setStatus('Connected');
      showToast('Connected to translation service', 'success');
      wsRef.current = websocket;
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received:', data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setStatus('Connection Error');
      showToast('Connection error', 'error');
    };

    websocket.onclose = () => {
      console.log('🔌 WebSocket closed');
      setWsConnected(false);
      setStatus('Disconnected');
      wsRef.current = null;
      setWs(null);
      
      if (isRecordingRef.current) {
        stopRealtimeRecording();
      }
      
      setTimeout(() => {
        if (!wsRef.current) {
          connectWebSocket();
        }
      }, 3000);
    };

    return websocket;
  }, []);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'session_created':
        console.log('Session created');
        showToast('Session created - ready to record', 'success');
        break;

      case 'speech_started':
        console.log('Speech started');
        setStatus('🎤 Listening...');
        break;

      case 'speech_stopped':
        console.log('Speech stopped');
        setStatus('Processing...');
        break;

      case 'input_transcription':
        if (data.text) {
          console.log('Transcription:', data.text);
          setRealtimeTranscript(data.text);
          showToast('Transcription received', 'success');
        }
        break;

      case 'translation':
        if (data.text) {
          console.log('Translation:', data.text);
          setRealtimeTranslation(data.text);
          showToast('Translation complete', 'success');
        }
        break;

      case 'translation_delta':
        if (data.text) {
          console.log('Translation delta:', data.text);
          setRealtimeTranslation(prev => prev + data.text);
        }
        break;

      case 'response_complete':
        console.log('Response complete');
        setStatus('Ready');
        break;

      case 'config_updated':
        console.log('Config updated:', data.target_lang);
        showToast(`Language set to: ${data.target_lang}`, 'success');
        break;

      case 'error':
        console.error('❌ Error:', data.error);
        showToast(data.error, 'error');
        break;

      default:
        console.log('Message:', data.type, data);
    }
  }, []);

  useEffect(() => {
    const websocket = connectWebSocket();
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setLanguagesLoading(true);
        const response = await fetch(`${API_URL}/v1/translate/text/languages`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch languages');
        }
        
        const data = await response.json();
        console.log('✅ Raw API response:', data);
        
        const languagesArray = Array.isArray(data) ? data : (data.languages || []);
        console.log('✅ Loaded languages:', languagesArray.length);
        setLanguages(languagesArray);
      } catch (error) {
        console.error('❌ Error fetching languages:', error);
        showToast('Failed to load languages', 'error');
        setLanguages([
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' },
          { code: 'fr', name: 'French' },
          { code: 'de', name: 'German' },
          { code: 'zh-CN', name: 'Chinese (Simplified)' },
          { code: 'ja', name: 'Japanese' },
          { code: 'ko', name: 'Korean' },
        ]);
      } finally {
        setLanguagesLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && targetLang) {
      console.log('⚙️ Sending config for language:', targetLang);
      wsRef.current.send(JSON.stringify({
        type: 'config',
        target_lang: targetLang
      }));
    }
  }, [targetLang]);

  const convertToPCM16 = (float32Array: Float32Array): Uint8Array => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return new Uint8Array(pcm16.buffer);
  };

  const resampleAudio = (audioData: Float32Array, fromSampleRate: number, toSampleRate: number) => {
    if (fromSampleRate === toSampleRate) {
      return audioData;
    }

    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const index = i * ratio;
      const indexFloor = Math.floor(index);
      const indexCeil = Math.min(indexFloor + 1, audioData.length - 1);
      const fraction = index - indexFloor;

      result[i] = audioData[indexFloor] * (1 - fraction) + audioData[indexCeil] * fraction;
    }

    return result;
  };

  const startRealtimeRecording = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showToast('Not connected to translation service', 'error');
      return;
    }

    try {
      console.log('=== Starting Recording ===');
      
      const isSecure = window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (!isSecure) {
        throw new Error('Microphone requires HTTPS or localhost');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Microphone access granted');
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      let chunkCount = 0;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        chunkCount++;
        const inputData = e.inputBuffer.getChannelData(0);

        const resampledData = audioContextRef.current!.sampleRate !== 24000
          ? resampleAudio(inputData, audioContextRef.current!.sampleRate, 24000)
          : inputData;

        const pcm16 = convertToPCM16(resampledData);
        const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(pcm16)));

        try {
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64Audio
          }));

          if (chunkCount % 50 === 0) {
            console.log(`Sent ${chunkCount} audio chunks`);
          }
        } catch (error) {
          console.error('Error sending audio:', error);
        }
      };

      setIsRecording(true);
      isRecordingRef.current = true;
      setRealtimeTranscript('');
      setRealtimeTranslation('');
      setStatus('🎤 Recording...');

      wsRef.current.send(JSON.stringify({ type: 'start' }));
      showToast('Recording started - speak naturally and pause', 'success');

    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Could not access microphone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const stopRealtimeRecording = () => {
    console.log('=== Stopping Recording ===');
    
    isRecordingRef.current = false;
    setIsRecording(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }

    setStatus('Ready');
    showToast('Recording stopped', 'info');
  };

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      showToast('✅ Microphone test successful!', 'success');
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      showToast(`Microphone test failed: ${error.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6">
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`px-4 py-3 rounded-lg shadow-lg border-2 ${
              msg.type === 'success' ? 'bg-green-100 text-green-800 border-green-300' :
              msg.type === 'error' ? 'bg-red-100 text-red-800 border-red-300' :
              'bg-blue-100 text-blue-800 border-blue-300'
            } animate-slide-in`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-800">🎤 Real-time Translation</h1>
            <p className="text-gray-600">Speak naturally and pause - translations appear automatically</p>
          </div>

          <div className={`text-center py-3 px-4 rounded-xl font-semibold ${
            wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {status}
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">From:</span>
              <Select value={sourceLang} onValueChange={setSourceLang} disabled={languagesLoading}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {Array.isArray(languages) && languages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-gray-400">→</span>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">To:</span>
              <Select value={targetLang} onValueChange={setTargetLang} disabled={languagesLoading}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={languagesLoading ? "Loading..." : "Select language"} />
                </SelectTrigger>
                <SelectContent>
                  {languagesLoading ? (
                    <SelectItem value="loading" disabled>Loading languages...</SelectItem>
                  ) : (
                    Array.isArray(languages) && languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-center items-center gap-4 py-8">
            <button
              onClick={testMicrophone}
              className="px-6 py-3 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-all"
            >
              Test Microphone
            </button>

            <button
              onClick={isRecording ? stopRealtimeRecording : startRealtimeRecording}
              disabled={!wsConnected}
              className={`w-32 h-32 rounded-full font-bold text-white text-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              {isRecording ? (
                <Square className="w-12 h-12 mx-auto" />
              ) : (
                <Mic className="w-12 h-12 mx-auto" />
              )}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600 space-y-1">
            <p>{isRecording ? '🎤 Recording... Speak naturally and pause' : 'Click to start recording'}</p>
            {!wsConnected && (
              <p className="text-red-600 text-xs">
                ⚠️ Must be served via <strong>http://localhost</strong> or <strong>https://</strong>
              </p>
            )}
          </div>

          {(realtimeTranscript || realtimeTranslation) && (
            <div className="space-y-4 mt-6">
              {realtimeTranscript && (
                <div className="bg-gray-50 border-l-4 border-purple-500 rounded-lg p-4">
                  <p className="text-xs font-semibold text-purple-600 uppercase mb-2">You said:</p>
                  <p className="text-gray-800">{realtimeTranscript}</p>
                </div>
              )}

              {realtimeTranslation && (
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                  <p className="text-xs font-semibold text-green-600 uppercase mb-2">Translation:</p>
                  <p className="text-green-800 font-medium">{realtimeTranslation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}