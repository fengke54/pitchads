import React, { useState, useEffect } from 'react';
import { PITCH_PROMPTS, STORAGE_KEY, RECEIVER_PERSONAS } from './constants';
import { PitchPrompt, AppState, PitchSession, DifficultyLevel } from './types';
import { Recorder } from './components/Recorder';
import { Results } from './components/Results';
import { HistoryDashboard } from './components/HistoryDashboard';
import { analyzePitch, generatePracticePrompts, generateObjection } from './services/geminiService';
import { Mic, BarChart2, Sparkles, Loader2, ArrowLeft, Plus, RefreshCw, Zap, Heart, Shield, ShieldAlert, Timer, MessageSquare, User, Brain, TrendingUp } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedPrompt, setSelectedPrompt] = useState<PitchPrompt | null>(null);
  const [sessions, setSessions] = useState<PitchSession[]>([]);
  const [currentSession, setCurrentSession] = useState<PitchSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Prompt Management
  const [displayedPrompts, setDisplayedPrompts] = useState<PitchPrompt[]>(PITCH_PROMPTS);
  const [customPromptText, setCustomPromptText] = useState("");
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

  // Game Settings
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Ally');
  const [customDurationMinutes, setCustomDurationMinutes] = useState<string>("1"); 

  // Conversation State
  const [pitchAudioBlob, setPitchAudioBlob] = useState<Blob | null>(null);
  const [pitchDuration, setPitchDuration] = useState(0);
  const [objectionText, setObjectionText] = useState<string>("");

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history on change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const handleSelectPrompt = (prompt: PitchPrompt) => {
    setSelectedPrompt(prompt);
    // Convert default seconds to minutes for the UI input
    setCustomDurationMinutes((prompt.durationTarget / 60).toString());
    setAppState(AppState.RECORDING_PITCH);
    setError(null);
    setPitchAudioBlob(null);
    setObjectionText("");
  };

  const handleAddCustomPrompt = () => {
    if (!customPromptText.trim()) return;
    const newPrompt: PitchPrompt = {
      id: `custom-${Date.now()}`,
      text: customPromptText,
      category: 'General',
      durationTarget: 60 // Default for custom
    };
    setDisplayedPrompts([newPrompt, ...displayedPrompts]);
    setCustomPromptText("");
    handleSelectPrompt(newPrompt);
  };

  const handleGenerateFreshPrompts = async () => {
    setIsGeneratingPrompts(true);
    try {
      // Learn from user history
      const pastPracticeTexts = sessions.map(s => s.prompt.text);
      const newPrompts = await generatePracticePrompts(pastPracticeTexts);
      if (newPrompts.length > 0) {
        setDisplayedPrompts(prev => [...newPrompts, ...prev]);
      }
    } catch (e) {
      console.error("Failed to generate prompts", e);
      setError("Could not generate new prompts. Try again.");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  // Step 1 Complete: Pitch Recorded
  const handlePitchComplete = async (audioBlob: Blob, duration: number) => {
    if (!selectedPrompt) return;
    
    setPitchAudioBlob(audioBlob);
    setPitchDuration(duration);
    setAppState(AppState.GENERATING_OBJECTION);
    setError(null);

    // Convert blob to base64 for Gemini
    try {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
           // Safely extract base64 data regardless of mime type prefix
           const base64String = (reader.result as string);
           const base64Audio = base64String.includes(',') ? base64String.split(',')[1] : base64String;
           
           try {
               const objection = await generateObjection(base64Audio, selectedPrompt.text, difficulty);
               setObjectionText(objection);
               setAppState(AppState.VIEWING_OBJECTION);
           } catch (err: any) {
               console.error(err);
               setError("Failed to generate objection. " + (err.message || ""));
               setAppState(AppState.RECORDING_PITCH); // Go back to start
           }
        };
    } catch (err) {
        setError("Error processing audio.");
        setAppState(AppState.RECORDING_PITCH);
    }
  };

  const handleStartRebuttal = () => {
    setAppState(AppState.RECORDING_RESPONSE);
  };

  // Step 2 Complete: Rebuttal Recorded
  const handleRebuttalComplete = async (rebuttalBlob: Blob, rebuttalDuration: number) => {
    if (!selectedPrompt || !pitchAudioBlob || !objectionText) return;

    setAppState(AppState.PROCESSING_FINAL);
    const targetSeconds = parseFloat(customDurationMinutes) * 60;

    try {
       // Need to read both blobs
       const pitchReader = new FileReader();
       const rebuttalReader = new FileReader();
       
       const pitchPromise = new Promise<string>((resolve) => {
          pitchReader.onloadend = () => {
            const res = pitchReader.result as string;
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          pitchReader.readAsDataURL(pitchAudioBlob);
       });

       const rebuttalPromise = new Promise<string>((resolve) => {
          rebuttalReader.onloadend = () => {
            const res = rebuttalReader.result as string;
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          rebuttalReader.readAsDataURL(rebuttalBlob);
       });

       const [pitchBase64, rebuttalBase64] = await Promise.all([pitchPromise, rebuttalPromise]);

       const analysis = await analyzePitch(
          pitchBase64, 
          objectionText, 
          rebuttalBase64, 
          selectedPrompt.text, 
          targetSeconds, 
          difficulty
       );

       // Calculate XP
       const multiplier = RECEIVER_PERSONAS[difficulty].multiplier;
       const xp = Math.round(analysis.scores.overall * multiplier);

       const newSession: PitchSession = {
         id: Date.now().toString(),
         timestamp: Date.now(),
         prompt: selectedPrompt,
         audioUrl: URL.createObjectURL(pitchAudioBlob), // Just play first one for now or we could merge
         responseAudioUrl: URL.createObjectURL(rebuttalBlob),
         objection: objectionText,
         transcription: analysis.transcription,
         scores: analysis.scores,
         feedback: analysis.feedback,
         duration: pitchDuration + rebuttalDuration,
         fillerWordCount: analysis.fillerWordCount,
         difficulty: difficulty,
         xpEarned: xp
       };

       setSessions(prev => [newSession, ...prev]);
       setCurrentSession(newSession);
       setAppState(AppState.RESULT);

    } catch (err: any) {
        console.error(err);
        setError("Analysis failed: " + err.message);
        setAppState(AppState.RECORDING_RESPONSE); // Retry rebuttal
    }
  };

  const handleViewSession = (session: PitchSession) => {
    setCurrentSession(session);
    setAppState(AppState.RESULT);
  };

  const renderDifficultyIcon = (level: string) => {
      switch(level) {
          case 'Ally': return <Heart size={20} className="mb-1 text-pink-500" />;
          case 'Pragmatist': return <User size={20} className="mb-1 text-blue-500" />;
          case 'Burned': return <Shield size={20} className="mb-1 text-amber-500" />;
          case 'Skeptic': return <TrendingUp size={20} className="mb-1 text-indigo-500" />;
          case 'Visionary': return <Brain size={20} className="mb-1 text-purple-500" />;
          case 'Challenger': return <ShieldAlert size={20} className="mb-1 text-red-500" />;
          default: return null;
      }
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
      case AppState.HISTORY:
        return (
          <div className="max-w-5xl mx-auto w-full">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Zap size={12} fill="currentColor" />
                Ads & Creative Edition
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                Pitch Pro. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Win the Room.</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Practice your campaign pitch with AI personas: The Ally, The Skeptic, The Visionary, and more.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
               {/* Practice Arena */}
               <div className="bg-white p-6 rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-50 flex flex-col items-start transition-transform duration-300">
                  <div className="w-full flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <Sparkles size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">Practice Arena</h2>
                    </div>
                    <button 
                      onClick={handleGenerateFreshPrompts}
                      disabled={isGeneratingPrompts}
                      className="text-xs flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      {isGeneratingPrompts ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
                      Refresh Bank
                    </button>
                  </div>
                  
                  {/* Custom Input */}
                  <div className="w-full mb-6 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. Sell a risky idea to Nike..."
                      value={customPromptText}
                      onChange={(e) => setCustomPromptText(e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-slate-900 bg-slate-900 text-white placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm font-medium"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPrompt()}
                    />
                    <button 
                      onClick={handleAddCustomPrompt}
                      className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 w-full">Current Prompt Bank ({displayedPrompts.length})</h3>
                  <div className="w-full space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayedPrompts.map(prompt => (
                      <button 
                        key={prompt.id}
                        onClick={() => handleSelectPrompt(prompt)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md hover:bg-white transition-all text-left group bg-slate-50/50"
                      >
                         <span className="font-medium text-slate-700 group-hover:text-indigo-700 text-sm line-clamp-2 pr-4">{prompt.text}</span>
                         <span className="shrink-0 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded group-hover:border-indigo-200">{prompt.durationTarget}s</span>
                      </button>
                    ))}
                  </div>
               </div>

               {/* Dashboard Stats */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                       <BarChart2 className="text-slate-400"/> Performance Stats
                     </h2>
                  </div>
                  {sessions.length > 0 ? (
                    <HistoryDashboard sessions={sessions} onSelectSession={handleViewSession} />
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                       <BarChart2 size={48} className="mb-4 opacity-20"/>
                       <p>No pitches yet. Start practicing!</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        );

      case AppState.RECORDING_PITCH:
        return (
          <div className="max-w-3xl mx-auto w-full pt-8 px-4">
            <button 
              onClick={() => setAppState(AppState.IDLE)} 
              className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors"
            >
               <ArrowLeft size={20} className="mr-1"/> Cancel
            </button>
            
            <div className="text-center mb-8">
               <span className="text-xs font-bold text-indigo-500 tracking-wider uppercase mb-2 block">Step 1: The Pitch</span>
               <h2 className="text-2xl font-bold text-slate-800 mb-2 leading-tight">"{selectedPrompt?.text}"</h2>
            </div>
            
            {/* Game Setup Panel */}
            <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               
               <div className="flex flex-col md:flex-row gap-6">
                  {/* Time Control */}
                  <div className="min-w-[150px]">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Timer size={14}/> Target Minutes
                    </label>
                    <div className="flex items-center gap-4">
                        <input 
                        type="number" 
                        min="0.1"
                        step="0.1"
                        value={customDurationMinutes}
                        onChange={(e) => setCustomDurationMinutes(e.target.value)}
                        className="w-full text-center p-3 border-2 border-slate-900 bg-slate-900 text-white rounded-lg font-mono text-xl font-bold focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 placeholder-slate-500"
                        />
                    </div>
                  </div>

                  {/* Difficulty Control */}
                  <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block flex items-center gap-2">
                        <Shield size={14}/> Receiver Persona (Select One)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(RECEIVER_PERSONAS) as DifficultyLevel[]).map((level) => {
                            const persona = RECEIVER_PERSONAS[level];
                            const isSelected = difficulty === level;
                            
                            return (
                              <button
                                key={level}
                                onClick={() => setDifficulty(level)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all h-20 ${
                                  isSelected 
                                  ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                                  : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                {renderDifficultyIcon(level)}
                                <span className={`text-[10px] font-bold uppercase text-center leading-tight ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                                  {persona.name}
                                </span>
                              </button>
                            );
                        })}
                      </div>
                  </div>
               </div>
               
               <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                   <p className="text-sm text-slate-600 font-medium">
                    Current Persona: <span className="font-bold text-indigo-600">{RECEIVER_PERSONAS[difficulty].name}</span>
                   </p>
                   <p className="text-xs text-slate-500 mt-1 italic">
                    "{RECEIVER_PERSONAS[difficulty].description}"
                  </p>
               </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-center text-sm">
                {error}
              </div>
            )}

            <Recorder 
              onRecordingComplete={handlePitchComplete} 
              targetDuration={parseFloat(customDurationMinutes) * 60}
              label="Start Recording"
            />
          </div>
        );

      case AppState.GENERATING_OBJECTION:
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 size={64} className="text-indigo-500 animate-spin mb-8" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{RECEIVER_PERSONAS[difficulty].name} is Thinking...</h2>
            <p className="text-slate-500 text-center max-w-md">
              Analyzing your pitch for weaknesses.
            </p>
          </div>
        );

      case AppState.VIEWING_OBJECTION:
      case AppState.RECORDING_RESPONSE:
        // Combined view for seamless flow
        return (
          <div className="max-w-3xl mx-auto w-full pt-12 px-4 flex flex-col items-center">
             
             {/* Objection Card - Always Visible during response phase */}
             <div className="w-full mb-8">
                <div className="flex items-center gap-3 mb-4 justify-center">
                    <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                      <MessageSquare size={24} />
                    </div>
                    <span className="text-sm font-bold text-indigo-900 uppercase tracking-wider">
                      {RECEIVER_PERSONAS[difficulty].name} Interrupts:
                    </span>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-indigo-100 relative animate-in fade-in zoom-in duration-300">
                   {/* Speech bubble tail */}
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white border-t border-l border-indigo-100 transform rotate-45"></div>
                   <p className="text-2xl font-medium text-slate-800 text-center leading-relaxed">
                     "{objectionText}"
                   </p>
                </div>
             </div>

             {appState === AppState.VIEWING_OBJECTION ? (
               <button 
                  onClick={handleStartRebuttal}
                  className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-700 hover:scale-105 shadow-lg"
               >
                  <Mic className="w-5 h-5 mr-2" />
                  Answer Objection
               </button>
             ) : (
               <div className="w-full animate-in slide-in-from-bottom duration-500">
                  <Recorder 
                    onRecordingComplete={handleRebuttalComplete}
                    targetDuration={30} 
                    label="Record Rebuttal"
                  />
               </div>
             )}
          </div>
        );

      case AppState.PROCESSING_FINAL:
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 size={64} className="text-indigo-500 animate-spin mb-8" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Final Deliberation</h2>
            <p className="text-slate-500 text-center max-w-md">
              Evaluating your initial pitch and how well you handled the objection.
            </p>
          </div>
        );

      case AppState.RESULT:
        if (!currentSession) return null;
        return (
          <div className="pt-8">
             <button 
              onClick={() => setAppState(AppState.IDLE)} 
              className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors max-w-3xl mx-auto w-full px-4"
            >
               <ArrowLeft size={20} className="mr-1"/> Back to Dashboard
            </button>
            <Results 
              session={currentSession} 
              onRetry={() => {
                if (currentSession.prompt) handleSelectPrompt(currentSession.prompt);
                else setAppState(AppState.IDLE);
              }}
              onHome={() => setAppState(AppState.IDLE)}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setAppState(AppState.IDLE)}
          >
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <Mic size={20} fill="currentColor" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">Pitch Pro</span>
          </div>
          
          {process.env.API_KEY ? (
             <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               AI Connected
             </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
               <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
               No API Key
             </div>
          )}
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Pitch Pro. Powered by Gemini 3 Pro.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;