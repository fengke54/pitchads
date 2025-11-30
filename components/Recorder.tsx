import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  targetDuration: number;
  label?: string;
}

export const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, targetDuration, label = "Tap to start recording" }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to force audio/webm for better compatibility with Gemini API
      let options: MediaRecorderOptions = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
         // Fallback for Safari or others
         options = {}; 
      }
      
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType }); 
        onRecordingComplete(blob, duration);
        stopVisualizer();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);
      
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      setupVisualizer(stream);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const setupVisualizer = (stream: MediaStream) => {
    if (!canvasRef.current) return;
    
    // Safety check: close old context if it exists and is open
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    
    sourceRef.current.connect(analyserRef.current);
    analyserRef.current.fftSize = 256;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;

    const draw = () => {
      if (!analyserRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for(let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#6366f1'); 
        gradient.addColorStop(1, '#a5b4fc'); 

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
       // Only close if not already closed
       audioContextRef.current.close().catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopVisualizer();
    };
  }, []);

  const progress = Math.min((duration / targetDuration) * 100, 100);
  const isOverTime = duration > targetDuration;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-100">
      <div className="mb-6 relative w-full h-32 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
        <canvas ref={canvasRef} width="400" height="128" className="w-full h-full" />
        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <Volume2 size={48} className="opacity-20" />
          </div>
        )}
      </div>

      <div className="text-4xl font-bold font-mono text-slate-800 mb-2">
        {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
      </div>
      
      <div className="w-full h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-linear ${isOverTime ? 'bg-amber-500' : 'bg-indigo-500'}`} 
          style={{ width: `${progress}%` }}
        />
      </div>

      {!isRecording ? (
        <button
          onClick={startRecording}
          className="group relative flex items-center justify-center w-20 h-20 bg-red-500 rounded-full shadow-xl hover:bg-red-600 transition-all focus:outline-none focus:ring-4 focus:ring-red-200 scale-100 hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20 group-hover:opacity-40"></div>
          <Mic className="text-white w-8 h-8" />
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="flex items-center justify-center w-20 h-20 bg-slate-800 rounded-full shadow-xl hover:bg-slate-900 transition-all focus:outline-none focus:ring-4 focus:ring-slate-200 scale-100 hover:scale-105 active:scale-95"
        >
          <Square className="text-white w-8 h-8 fill-current" />
        </button>
      )}

      <p className="mt-6 text-slate-500 text-sm font-medium">
        {isRecording ? (isOverTime ? "Wrap it up!" : "Listening...") : label}
      </p>
    </div>
  );
};