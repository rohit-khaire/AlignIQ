import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { History as HistoryIcon, Clock, FileText, TrendingUp, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';

export const History: React.FC = () => {
  const { userId } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<{last_login: string | null, docs_uploaded: number}>({last_login: null, docs_uploaded: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch historical scores
        const resScores = await fetch(`${API_URL}/api/v1/compliance/history`, {
          headers: { 'X-User-ID': userId || 'anonymous' }
        });
        if (!resScores.ok) {
            const errText = await resScores.text();
            throw new Error(`Failed to fetch historical data: ${resScores.status} ${resScores.statusText} - ${errText}`);
        }
        const jsonScores = await resScores.json();
        
        // Fetch user stats
        const resStats = await fetch(`${API_URL}/api/v1/users/stats`, {
          headers: { 'X-User-ID': userId || 'anonymous' }
        });
        if (!resStats.ok) {
            const errText = await resStats.text();
            throw new Error(`Failed to fetch user stats: ${resStats.status} ${resStats.statusText} - ${errText}`);
        }
        const jsonStats = await resStats.json();

        setStats(jsonStats.data);

        const historyArray = jsonScores.history || [];
        const formattedData = historyArray.map((item: any) => {
          const date = new Date(item.timestamp);
          return {
            ...item,
            dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
            fullDate: date.toLocaleString()
          };
        });
        
        setData(formattedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8 max-w-4xl mx-auto mt-20 glass-card rounded-[21px] border-rose-500/30 text-rose-500 dark:text-rose-400 text-center">
        Error loading history: {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-20 p-12 glass-card rounded-[21px] border-border text-center flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
          <HistoryIcon className="w-10 h-10 text-primary opacity-80" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No History Yet</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          You haven't run any compliance scans yet. Upload your first document in the Analyze tab to start building your compliance history.
        </p>
      </div>
    );
  }

  const formattedLastLogin = stats.last_login ? new Date(stats.last_login).toLocaleString() : 'N/A';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 border border-border p-4 rounded-[21px] shadow-2xl backdrop-blur-md">
          <p className="text-muted-foreground font-medium mb-3 text-xs uppercase tracking-wider">{payload[0].payload.fullDate}</p>
          <div className="space-y-2">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></span>
              Compliance Score: <span className="text-primary ml-auto">{payload[0].value}%</span>
            </p>
            <div className="h-px w-full bg-border my-2"></div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Satisfied Rules: <span className="text-emerald-500 ml-auto font-medium">{payload[0].payload.satisfied}</span>
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-3 h-3 text-rose-500" />
              Missing Rules: <span className="text-rose-500 ml-auto font-medium">{payload[0].payload.missing}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pt-20 pb-20 px-6">
      
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground tracking-tight mb-2">
          Your History
        </h1>
        <p className="text-muted-foreground">Track your compliance progress and account statistics over time.</p>
      </div>

      {/* User Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-[21px] border border-border relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Last Login</p>
              <h3 className="text-xl font-bold text-foreground">{formattedLastLogin}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-fuchsia-900/30 flex items-center justify-center border border-fuchsia-500/30">
              <Clock className="w-5 h-5 text-fuchsia-500" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[21px] border border-border relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Total Documents Uploaded</p>
              <h3 className="text-3xl font-bold text-foreground">{stats.docs_uploaded}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-sky-900/30 flex items-center justify-center border border-sky-500/30">
              <FileText className="w-5 h-5 text-sky-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-[21px] border border-border h-[500px] flex flex-col relative overflow-hidden mt-8"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-20 -mt-20"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary" />
            Historical Compliance Trajectory
          </h3>
          <span className="px-3 py-1 bg-muted rounded-lg text-xs text-muted-foreground border border-border">{data.length} Scans</span>
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
      </motion.div>

    </div>
  );
};
