import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { Activity, TrendingUp, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CisoDashboardProps {
  currentScore: number;
  currentSatisfied: number;
  currentMissing: number;
}

export const CisoDashboard: React.FC<CisoDashboardProps> = ({ currentScore, currentSatisfied, currentMissing }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/compliance/history`);
        if (!res.ok) throw new Error('Failed to fetch historical data');
        const json = await res.json();
        
        // Format dates for the chart
        const historyArray = json.history || [];
        const formattedData = historyArray.map((item: any) => {
          const date = new Date(item.timestamp);
          return {
            ...item,
            dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
            fullDate: date.toLocaleDateString()
          };
        });
        
        // Append the live data as the final point so the graph ends on reality
        formattedData.push({
          score: currentScore,
          satisfied: currentSatisfied,
          missing: currentMissing,
          dateLabel: 'Now',
          fullDate: 'Current Scan'
        });
        
        setData(formattedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [currentScore, currentSatisfied, currentMissing]);

  if (loading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center glass-card rounded-2xl">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8 glass-card rounded-2xl border-rose-500/30 text-rose-400 text-center">
        Error loading analytics: {error}
      </div>
    );
  }

  // Use the actual current data for the KPIs, and compare it against the last DB entry (which is now data.length - 2)
  const previousData = data.length > 1 ? data[data.length - 2] : { score: 0 };
  const scoreDiff = currentScore - (previousData?.score || 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-zinc-400 font-medium mb-3 text-xs uppercase tracking-wider">{payload[0].payload.fullDate}</p>
          <div className="space-y-2">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
              Compliance Score: <span className="text-cyan-400 ml-auto">{payload[0].value}%</span>
            </p>
            <div className="h-px w-full bg-white/10 my-2"></div>
            <p className="text-xs text-zinc-300 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Satisfied Rules: <span className="text-emerald-400 ml-auto font-medium">{payload[0].payload.satisfied}</span>
            </p>
            <p className="text-xs text-zinc-300 flex items-center gap-2">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Missing Rules: <span className="text-rose-400 ml-auto font-medium">{payload[0].payload.missing}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6 relative z-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1 */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-zinc-400 text-sm font-medium mb-1">Current Score</p>
              <h3 className="text-3xl font-bold text-white">{currentScore}%</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium relative z-10">
            <span className={scoreDiff >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {scoreDiff >= 0 ? "+" : ""}{scoreDiff}%
            </span>
            <span className="text-zinc-500">from last scan</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-zinc-400 text-sm font-medium mb-1">Rules Satisfied</p>
              <h3 className="text-3xl font-bold text-white">{currentSatisfied}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-zinc-400 text-sm font-medium mb-1">Rules Missing</p>
              <h3 className="text-3xl font-bold text-white">{currentMissing}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-900/50 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
          </div>
        </div>

      </div>

      {/* Main Chart Area */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 h-[450px] flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] -mr-20 -mt-20"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            Compliance Trajectory
          </h3>
          <span className="px-3 py-1 bg-white/5 rounded-lg text-xs text-zinc-400 border border-white/10">Last 30 Days</span>
        </div>

        <div className="flex-1 w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#71717a" 
                tick={{ fill: '#71717a', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
                minTickGap={30}
              />
              <YAxis 
                stroke="#71717a" 
                tick={{ fill: '#71717a', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
                domain={[0, 100]} 
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#22d3ee" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                activeDot={{ r: 6, fill: "#22d3ee", stroke: "#083344", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};
