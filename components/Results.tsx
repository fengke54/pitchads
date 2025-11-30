import React, { useState } from 'react';
import { PitchSession } from '../types';
import { Play, Pause, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Zap, Shield, Heart, ShieldAlert } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface ResultsProps {
  session: PitchSession;
  onRetry: () => void;
  onHome: () => void;
}

export const Results: React.FC<ResultsProps> = ({ session, onRetry, onHome }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const chartData = [
    { subject: 'Structure', A: session.scores.structure, fullMark: 100 },
    { subject: 'Clarity', A: session.scores.clarity, fullMark: 100 },
    { subject: 'Brevity', A: session.scores.brevity, fullMark: 100 },
    { subject: 'Delivery', A: session.scores.delivery, fullMark: 100 },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const DifficultyIcon = {
    Easy: Heart,
    Medium: Shield,
    Hard: ShieldAlert
  }[session.difficulty || 'Easy'];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header Score */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
             <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1
                ${session.difficulty === 'Hard' ? 'bg-red-50 text-red-700 border-red-200' : 
                  session.difficulty === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                  'bg-pink-50 text-pink-700 border-pink-200'}`}>
                <DifficultyIcon size={12}/> {session.difficulty || 'Easy'} Mode
             </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Mission Report</h2>
          <p className="text-slate-500">Analysis from {session.difficulty === 'Easy' ? 'your mentor' : session.difficulty === 'Hard' ? 'the skeptic' : 'the client'}.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">XP Earned <Zap size={12} className="text-yellow-500 fill-current"/></span>
            <span className="text-2xl font-bold text-slate-700">+{session.xpEarned || 0}</span>
          </div>
          <div className="w-px h-12 bg-slate-200 hidden md:block"></div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Overall</span>
            <span className={`text-4xl font-bold ${getScoreColor(session.scores.overall).split(' ')[0]}`}>
              {session.scores.overall}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 h-80 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Score Breakdown</h3>
          <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="#6366f1"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Feedback */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Coach Feedback</h3>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <p className="text-slate-800 text-sm font-medium italic">"{session.feedback.summary}"</p>
            </div>

            {[
              { label: 'Structure', text: session.feedback.structure, score: session.scores.structure },
              { label: 'Clarity', text: session.feedback.clarity, score: session.scores.clarity },
              { label: 'Brevity', text: session.feedback.brevity, score: session.scores.brevity },
              { label: 'Delivery', text: session.feedback.delivery, score: session.scores.delivery },
            ].map((item) => (
               <div key={item.label} className="flex gap-3 items-start">
                  {item.score > 70 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">{item.label}</h4>
                    <p className="text-sm text-slate-600">{item.text}</p>
                  </div>
               </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transcription & Audio */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
         <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Transcription & Audio</h3>
             {session.audioUrl && (
               <button 
                onClick={togglePlayback}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors text-sm font-medium"
               >
                 {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                 {isPlaying ? 'Pause Recording' : 'Play Recording'}
               </button>
             )}
         </div>
         
         <audio 
           ref={audioRef} 
           src={session.audioUrl} 
           onEnded={() => setIsPlaying(false)}
           className="hidden" 
         />

         <div className="relative">
            <div className={`text-slate-700 leading-relaxed ${!showTranscription ? 'line-clamp-3' : ''}`}>
              {session.transcription}
            </div>
            <button 
              onClick={() => setShowTranscription(!showTranscription)}
              className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {showTranscription ? (
                <>Show Less <ChevronUp size={16}/></>
              ) : (
                <>Show Full Transcription <ChevronDown size={16}/></>
              )}
            </button>
         </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center pt-6">
        <button 
          onClick={onRetry}
          className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
        >
          Try Another Pitch
        </button>
        <button 
          onClick={onHome}
          className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};