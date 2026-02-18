
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { MicIcon, StopIcon, VolumeIcon } from './Icons';

// --- Utility Functions for Audio Encoding/Decoding ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const VoiceInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [aiTranscription, setAiTranscription] = useState<string>('');
  
  const aiRef = useRef<any>(null);
  const sessionPromise = useRef<Promise<any> | null>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const nextStartTime = useRef<number>(0);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStream = useRef<MediaStream | null>(null);

  const toggleSession = async () => {
    if (isActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    // Directly use the provided API key logic
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    aiRef.current = ai;

    inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    try {
      micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      sessionPromise.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            const source = inputAudioContext.current!.createMediaStreamSource(micStream.current!);
            const scriptProcessor = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => prev + ' ' + message.serverContent?.inputTranscription?.text);
            }
            if (message.serverContent?.outputTranscription) {
              setAiTranscription(prev => prev + ' ' + message.serverContent?.outputTranscription?.text);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContext.current) {
              nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext.current, 24000, 1);
              const source = outputAudioContext.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.current.destination);
              source.start(nextStartTime.current);
              nextStartTime.current += audioBuffer.duration;
              sources.current.add(source);
              source.onended = () => sources.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sources.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sources.current.clear();
              nextStartTime.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Voice Error:", e);
            stopSession();
          },
          onclose: () => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are NovaAI in Voice Mode. Be helpful, concise, and professional. Use a friendly conversational tone.'
        }
      });
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      alert("Mic access denied or connection failed.");
    }
  };

  const stopSession = () => {
    sessionPromise.current?.then(s => {
      try { s.close(); } catch(e) {}
    });
    
    // Cleanup Audio Contexts
    if (inputAudioContext.current) {
      inputAudioContext.current.close().catch(() => {});
      inputAudioContext.current = null;
    }
    if (outputAudioContext.current) {
      sources.current.forEach(s => {
        try { s.stop(); } catch(e) {}
      });
      sources.current.clear();
      outputAudioContext.current.close().catch(() => {});
      outputAudioContext.current = null;
    }

    // Cleanup Mic Tracks
    if (micStream.current) {
      micStream.current.getTracks().forEach(t => t.stop());
      micStream.current = null;
    }

    setIsActive(false);
    setIsConnecting(false);
    setTranscription('');
    setAiTranscription('');
    sessionPromise.current = null;
    nextStartTime.current = 0;
  };

  useEffect(() => {
    return () => { if (isActive) stopSession(); };
  }, [isActive]);

  return (
    <div className="flex flex-col h-full items-center justify-center p-8 max-w-4xl mx-auto w-full">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-2">Voice Workspace</h2>
        <p className="text-slate-400">Real-time, zero-latency conversational intelligence.</p>
      </div>

      <div className="flex flex-col items-center gap-10 mb-16">
        <div className={`w-48 h-48 rounded-full flex items-center justify-center relative transition-all duration-700 ${isActive ? 'bg-cyan-500/10' : 'bg-slate-900'}`}>
          {/* Animated Rings */}
          {isActive && (
            <>
              <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[ping_3s_infinite]"></div>
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-[ping_2s_infinite]"></div>
            </>
          )}
          
          <button 
            onClick={toggleSession}
            disabled={isConnecting}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl ${
              isActive 
                ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20' 
                : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20'
            } active:scale-95`}
          >
            {isConnecting ? (
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : isActive ? (
              <StopIcon />
            ) : (
              <MicIcon />
            )}
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="whitespace-nowrap px-4 py-1 glass border-slate-800 rounded-full">
            <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-600'}`}>
              {isConnecting ? 'Establishing Link...' : isActive ? 'Live Connection' : 'Ready to Connect'}
            </span>
          </div>

          {isActive && (
            <button
              onClick={stopSession}
              className="flex items-center gap-2 px-6 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-2"
            >
              <StopIcon />
              STOP CHAT
            </button>
          )}
        </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-3xl border-slate-800 min-h-[150px] flex flex-col transition-all hover:border-slate-700">
          <div className="flex items-center gap-2 mb-4 text-slate-500">
            <MicIcon />
            <span className="text-[10px] font-bold uppercase tracking-widest">Your Input</span>
          </div>
          <p className="text-sm text-slate-300 italic line-clamp-4">
            {transcription || (isActive ? "Listening..." : "Waiting for connection...")}
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border-slate-800 min-h-[150px] flex flex-col transition-all hover:border-cyan-500/20">
          <div className="flex items-center gap-2 mb-4 text-cyan-500">
            <VolumeIcon />
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">Nova Output</span>
          </div>
          <p className="text-sm text-slate-200 line-clamp-4">
            {aiTranscription || (isActive ? "Nova is ready to talk." : "Offline.")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterface;
