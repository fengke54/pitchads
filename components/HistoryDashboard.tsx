import React from 'react';
import { PitchSession } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Award, Zap, ShieldAlert, Heart, Shield } from 'lucide-react';

interface HistoryDashboardProps {
  sessions: PitchSession[];
  onSelectSession: (session: PitchSession) => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ sessions, onSelectSession }) => {
  if (sessions.length === 0) return null;

  // Prepare chart data 
  const chartData = [...sessions].reverse().map((s, index) => ({
    name: index + 1,
    score: s.scores.overall,
    xp: s.xpEarned || 0,
    date: new Date(s.timestamp).toLocaleDateString(),
  }));

  const totalXP = sessions.reduce((acc, curr) => acc + (curr.xpEarned || 0), 0);
  const averageScore = Math.round(sessions.reduce((acc, curr) => acc + curr.scores.overall, 0) / sessions.length);
  const bestScore = Math.max(...sessions.map(s => s.scores.overall));

  return (
    <div className="space-y-8">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
           <div className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-1">Total XP</div>
           <div className="text-3xl font-bold text-indigo-600 flex items-center gap-2">
             {totalXP.toLocaleString()} <Zap size={24} className="text-yellow-500 fill-current"/>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
           <div className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-1">Total Sessions</div>
           <div className="text-3xl font-bold text-slate-900">{sessions.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
           <div className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-1">Avg Score</div>
           <div className="text-3xl font-bold text-indigo-600">{averageScore}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
           <div className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-1">Best Score</div>
           <div className="text-3xl font-bold text-green-600">{bestScore}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-72">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Performance Trend</h3>
        <ResponsiveContainer width="100%" height="80%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" hide />
            <YAxis domain={[0, 100]} tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
              labelStyle={{ display: 'none' }}
            />
            <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
           <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recent History</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              onClick={() => onSelectSession(session)}
              className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between group gap-4"
            >
               <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                    session.scores.overall >= 80 ? 'bg-green-100 text-green-700' :
                    session.scores.overall >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {session.scores.overall}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{session.prompt.text}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(session.timestamp).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock size={12}/> {session.duration}s</span>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        {session.difficulty === 'Easy' && <Heart size={10} className="text-pink-500"/>}
                        {session.difficulty === 'Medium' && <Shield size={10} className="text-blue-500"/>}
                        {session.difficulty === 'Hard' && <ShieldAlert size={10} className="text-red-500"/>}
                        {session.difficulty || 'Easy'} Mode
                      </span>
                    </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-4 pl-16 sm:pl-0">
                   <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">XP Earned</div>
                      <div className="text-sm font-bold text-indigo-600">+{session.xpEarned || 0}</div>
                   </div>
                   <div className="text-slate-300 group-hover:text-indigo-400">
                      <Clock size={20} className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity" />
                   </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};