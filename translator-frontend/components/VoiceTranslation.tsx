"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mic, Square, Upload, Loader2 } from 'lucide-react';
import { useAudioTranslation, useSupportedLanguages } from '@/lib/hooks/useTranslation';
import { supabase } from '@/lib/supabase_client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VoiceTranslation() {
  const [fileTranscript, setFileTranscript] = useState('');
  const [fileTranslation, setFileTranslation] = useState('');

  const audioTranslateMutation = useAudioTranslation();
  const { data: languagesData, isLoading: languagesLoading } = useSupportedLanguages();

  const languages = languagesData?.languages || [];

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [realtimeTranslation, setRealtimeTranslation] = useState('');
  const [status, setStatus] = useState('Disconnected');

  const [targetLang, setTargetLang] = useState('en');
  const [sourceLang, setSourceLang] = useState('auto');

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const languageRef = useRef({ sourceLang, targetLang });

  const connectWebSocket = useCallback(async () => {
    console.log('🔌 Attempting to connect WebSocket...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Authentication required for real-time translation');
        return;
      }

      const wsUrl = `${API_URL.replace('http', 'ws')}/v1/translate/audio/realtime?token=${session.access_token}`;
      console.log('🔗 Connecting to WebSocket:', wsUrl.replace(session.access_token, '[TOKEN]'));
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        setStatus('Connected');
        setWs(websocket);
        toast.success('Connected to real-time translation service');

        const { sourceLang: currentSource, targetLang: currentTarget } = languageRef.current;
        websocket.send(JSON.stringify({
          type: 'config',
          source_lang: currentSource,
          target_lang: currentTarget
        }));
      };

      websocket.onmessage = (event) => {
        handleWebSocketMessage(event);
      };

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket URL:', `${API_URL.replace('http', 'ws')}/v1/translate/audio/realtime`);
        console.error('WebSocket readyState:', websocket.readyState);
        setWsConnected(false);
        setStatus('Error');
        toast.error('Connection error - check if backend is running');
      };

      websocket.onclose = () => {
        console.log('🔌 WebSocket closed');
        setWsConnected(false);
        setStatus('Disconnected');
        setWs(null);
        wsRef.current = null;

        if (isRecordingRef.current) {
          stopRealtimeRecording();
        }
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      setWsConnected(false);
      setStatus('Error');
      toast.error('Failed to connect');
    }
  }, []);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 Received:', data.type, data);

      switch (data.type) {
        case 'session_created':
          console.log('✅ Session created:', data.message);
          break;
        case 'session_updated':
          console.log('🔄 Session updated:', data.message);
          break;
        case 'config_updated':
          console.log('⚙️ Config updated for language:', data.target_lang);
          break;
        case 'input_transcription':
          console.log('🎯 Transcript received:', data.text);
          setRealtimeTranscript(data.text || '');
          break;
        case 'translation':
          console.log('🌍 Translation received:', data.text);
          setRealtimeTranslation(data.text || '');
          break;
        case 'translation_delta':
          console.log('🌍 Translation delta:', data.text, 'Final:', data.is_final);
          if (data.is_final) {
            setRealtimeTranslation(data.text || '');
          }
          break;
        case 'speech_started':
          console.log('🎤 Speech detected');
          break;
        case 'speech_stopped':
          console.log('🔇 Speech ended');
          break;
        case 'audio_committed':
          console.log('💾 Audio committed');
          break;
        case 'response_started':
          console.log('🔄 Generating response');
          break;
        case 'response_complete':
          console.log('✅ Translation complete');
          toast.success('Translation saved to history');
          break;
        case 'text_response':
          console.log('📝 Text response received:', data.text);
          setRealtimeTranslation(data.text || '');
          toast.success('Translation saved to history');
          break;
        case 'error':
          console.error('❌ Server error:', data.error);
          toast.error(data.error || 'Translation error');
          break;
        default:
          console.log('📨 Unknown message type:', data.type, data);
          break;
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    languageRef.current = { sourceLang, targetLang };

    setRealtimeTranscript('');
    setRealtimeTranslation('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('🔄 Updating language config:', { sourceLang, targetLang });
      wsRef.current.send(JSON.stringify({
        type: 'config',
        source_lang: sourceLang,
        target_lang: targetLang
      }));
    }
  }, [sourceLang, targetLang]);

  const convertToPCM16 = (float32Array: Float32Array): Int16Array => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  };

  const resampleAudio = (audioData: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array => {
    if (fromSampleRate === toSampleRate) {
      return audioData;
    }

    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      result[i] = audioData[srcIndexFloor] * (1 - fraction) + audioData[srcIndexCeil] * fraction;
    }

    return result;
  };

  const startRealtimeRecording = async () => {
    if (!wsConnected || !ws) {
      toast.error('Please wait for connection');
      return;
    }

    try {
      const isSecure = window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (!isSecure) {
        toast.error('Microphone requires HTTPS or localhost');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        const hasAudio = inputData.some(sample => Math.abs(sample) > 0.01);
        if (!hasAudio) return;

        const targetSampleRate = 16000;
        const currentSampleRate = audioContext.sampleRate;

        let processedData: Float32Array;
        if (currentSampleRate !== targetSampleRate) {
          processedData = resampleAudio(inputData, currentSampleRate, targetSampleRate);
        } else {
          processedData = inputData;
        }

        const pcm16 = convertToPCM16(processedData);

        try {
          const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: audioBase64
          }));
        } catch (error) {
          console.error('❌ Error sending audio:', error);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      isRecordingRef.current = true;
      toast.success('Recording started');

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRealtimeRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    toast.info('Recording stopped');
  };

  const processAudioFile = async (file: File) => {
    console.log('Processing audio file:', file.name, 'Target language:', targetLang);
    setFileTranscript('');
    setFileTranslation('');

    audioTranslateMutation.mutate(
      { file, targetLang },
      {
        onSuccess: (data) => {
          console.log('Audio translation response:', data);
          setFileTranscript(data.transcribed_text || '');
          setFileTranslation(data.translated_text || '');
          toast.success('Translation complete!');
        },
        onError: (error) => {
          console.error('Audio translation error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Translation failed';
          toast.error(`Translation failed: ${errorMessage}`);
        },
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Selected audio file:', file.name, file.size, file.type);
      processAudioFile(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-xl font-semibold mb-4">Voice Translation</h2>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">From:</span>
            <Select value={sourceLang} onValueChange={setSourceLang} disabled>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm text-muted-foreground">→</span>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">To:</span>
            <Select value={targetLang} onValueChange={setTargetLang} disabled={languagesLoading}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="upload">Upload File</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className="w-full max-w-xs h-16"
                onClick={isRecording ? stopRealtimeRecording : startRealtimeRecording}
                disabled={!wsConnected}
              >
                {isRecording ? (
                  <>
                    <Square className="mr-2 h-5 w-5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Start Recording
                  </>
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                {isRecording ? '🎤 Recording... Speak naturally and pause for translation' : 'Click to start recording'}
              </p>

              <div className={`text-sm p-2 rounded-lg text-center ${
                wsConnected 
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20' 
                  : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20'
              }`}>
                {wsConnected ? '✅ Connected to real-time service' : `⚠️ ${status} - Connecting to real-time service...`}
              </div>

              {!wsConnected && (
                <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                  ⚠️ Note: This must be served via{' '}
                  <strong>http://localhost</strong> or <strong>https://</strong> for microphone access
                </div>
              )}
            </div>

            {(realtimeTranscript || realtimeTranslation) && (
              <div className="mt-6 space-y-4">
                <div className="glass-card rounded-lg p-4">
                  <h3 className="font-semibold mb-2">You said:</h3>
                  <p className="text-muted-foreground">{realtimeTranscript || '...'}</p>
                </div>

                <div className="glass-card rounded-lg p-4 bg-primary/5">
                  <h3 className="font-semibold mb-2">Translation:</h3>
                  <p className="text-lg">{realtimeTranslation || '...'}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col items-center gap-4">
              <label htmlFor="audio-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload audio file</p>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: MP3, WAV, M4A, FLAC (Max 25MB)
                  </p>
                </div>
              </label>
              <input
                id="audio-upload"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={audioTranslateMutation.isPending}
              />
            </div>

            {audioTranslateMutation.isPending && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing...</span>
              </div>
            )}

            {(fileTranscript || fileTranslation) && !audioTranslateMutation.isPending && (
              <div className="mt-6 space-y-4">
                <div className="glass-card rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Transcript:</h3>
                  <p className="text-muted-foreground">{fileTranscript || 'No transcript available'}</p>
                </div>

                <div className="glass-card rounded-lg p-4 bg-primary/5">
                  <h3 className="font-semibold mb-2">Translation:</h3>
                  <p className="text-lg">{fileTranslation || 'No translation available'}</p>
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                <p>Debug - fileTranscript: "{fileTranscript}"</p>
                <p>Debug - fileTranslation: "{fileTranslation}"</p>
                <p>Debug - isPending: {audioTranslateMutation.isPending.toString()}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
