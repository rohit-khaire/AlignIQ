import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../config';
import ReactMarkdown from 'react-markdown';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  FileText,
  Lightbulb,
  BarChart3,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Download,
  Loader2,
  Wand2,
  Bot
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

import { ChatOracle } from './ChatOracle';
import { KnowledgeGraph3D } from './KnowledgeGraph3D';
import { CisoDashboard } from './CisoDashboard';
import { MessageSquare, Network, TrendingUp, X } from 'lucide-react';

interface ReportDashboardProps {
  report: any[];
  onReset: () => void;
  onAutoFix: () => void;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ report, onReset, onAutoFix }) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'graph' | 'ciso'>('dashboard');

  // Calculate global stats
  const totalPolicies = report.length;
  const totalReqs = report.reduce((acc, pol) => acc + (pol.summary?.total_requirements || 0), 0);
  const satisfiedReqs = report.reduce((acc, pol) => acc + (pol.summary?.satisfied || 0), 0);
  const partialReqs = report.reduce((acc, pol) => acc + (pol.summary?.partially_satisfied || 0), 0);
  const notSatisfiedReqs = report.reduce((acc, pol) => acc + (pol.summary?.not_satisfied || 0), 0);
  const globalCompliance = totalReqs > 0 ? Math.round(((satisfiedReqs + (partialReqs * 0.5)) / totalReqs) * 100) : 0;

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      const response = await fetch(`${API_URL}/api/v1/compliance/export?format=${format}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to export report');
      }
      
      const blob = await response.blob();
      let filename = `compliance_report.${format}`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length === 2)
          filename = filenameMatch[1];
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Auto-Fix Banner */}
      {(notSatisfiedReqs > 0 || partialReqs > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-2xl p-6 bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/30 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-fuchsia-500/5 blur-xl"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-fuchsia-500/20 flex items-center justify-center border border-fuchsia-400/30">
              <Wand2 className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">AI Policy Auto-Fixer</h3>
              <p className="text-zinc-300 text-sm">Automatically rewrite your policies to satisfy the {notSatisfiedReqs + partialReqs} missing requirements.</p>
            </div>
          </div>
          <button
            onClick={onAutoFix}
            className="relative z-10 px-6 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)] flex items-center gap-2 whitespace-nowrap"
          >
            <Wand2 className="w-5 h-5" /> Auto-Fix Violations
          </button>
        </motion.div>
      )}

      {/* Header and Global Stats with Visual Analytics */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8 relative overflow-hidden glow-border"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-cyan-400" />
                  Compliance Report
                </h2>
                <p className="text-zinc-400 mb-4">Analysis completed across {totalPolicies} master policies.</p>
              </div>
              
              <div className="flex flex-col gap-3 items-end">
                {/* View Toggle */}
                <div className="flex bg-zinc-900/80 p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setViewMode('dashboard')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'dashboard' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <BarChartIcon className="w-4 h-4" /> Dashboard
                  </button>
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'graph' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <Network className="w-4 h-4" /> 3D Graph
                  </button>
                  <button
                    onClick={() => setViewMode('ciso')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'ciso' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <TrendingUp className="w-4 h-4" /> History
                  </button>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleExport('json')}
                    disabled={exporting !== null}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors border border-zinc-700"
                  >
                    {exporting === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} JSON
                  </button>
                  <button 
                    onClick={() => handleExport('csv')}
                    disabled={exporting !== null}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors border border-zinc-700"
                  >
                    {exporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} CSV
                  </button>
                  <button 
                    onClick={() => handleExport('pdf')}
                    disabled={exporting !== null}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-900/40 text-cyan-400 text-sm hover:bg-cyan-900/60 transition-colors border border-cyan-800"
                  >
                    {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
            <div className="text-center px-4 border-r border-white/10">
              <div className="text-3xl font-bold text-white">{globalCompliance}%</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Score</div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-sm text-white font-medium">{satisfiedReqs}</span>
              </div>
              <div className="flex flex-col items-center">
                <AlertTriangle className="w-5 h-5 text-amber-400 mb-1" />
                <span className="text-sm text-white font-medium">{partialReqs}</span>
              </div>
              <div className="flex flex-col items-center">
                <XCircle className="w-5 h-5 text-rose-400 mb-1" />
                <span className="text-sm text-white font-medium">{notSatisfiedReqs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC VIEW SECTION --- */}
        {viewMode === 'dashboard' ? (
          <VisualAnalytics 
            satisfied={satisfiedReqs} 
            partial={partialReqs} 
            missing={notSatisfiedReqs} 
            report={report} 
          />
        ) : viewMode === 'graph' ? (
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <KnowledgeGraph3D report={report} />
          </div>
        ) : (
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <CisoDashboard 
              currentScore={globalCompliance}
              currentSatisfied={satisfiedReqs}
              currentMissing={notSatisfiedReqs}
            />
          </div>
        )}
        
      </motion.div>

      {/* Policies List */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {report.map((policy, idx) => (
            <PolicyCard key={policy.policy_id || idx} policy={policy} index={idx} />
          ))}
        </div>
      )}

      <div className="flex justify-center pt-8">
        <button 
          onClick={onReset}
          className="px-8 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
        >
          Analyze Another Document
        </button>
      </div>

      {/* Floating Action Button for Chat Oracle */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOracleOpen(!isOracleOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-fuchsia-600 rounded-full shadow-[0_0_30px_rgba(192,38,211,0.5)] flex items-center justify-center text-white hover:bg-fuchsia-500 transition-colors z-[60] border border-fuchsia-400/30 group"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOracleOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <X className="w-7 h-7" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <MessageSquare className="w-7 h-7" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Tooltip */}
        <AnimatePresence>
          {!isOracleOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-4 bg-zinc-900 border border-white/10 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              Ask the Policy Oracle
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Oracle Widget */}
      <ChatOracle isOpen={isOracleOpen} onClose={() => setIsOracleOpen(false)} />

    </div>
  );
};

// --- VISUAL ANALYTICS COMPONENT ---
const VisualAnalytics = ({ satisfied, partial, missing, report }: { satisfied: number, partial: number, missing: number, report: any[] }) => {
  const pieData = [
    { name: 'Satisfied', value: satisfied, color: '#34d399' }, // emerald-400
    { name: 'Partial', value: partial, color: '#fbbf24' },     // amber-400
    { name: 'Missing', value: missing, color: '#fb7185' }      // rose-400
  ].filter(d => d.value > 0);

  const barData = report.map(pol => ({
    name: pol.policy_id || (pol.policy_title ? pol.policy_title.substring(0, 12) + '...' : 'Unknown'),
    fullTitle: pol.policy_title || 'Unknown',
    score: pol.summary?.compliance_percentage || 0
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 border border-white/10 p-3 rounded-lg shadow-xl relative z-50">
          <p className="text-white font-medium mb-1 text-sm">{payload[0].payload.name || payload[0].payload.fullTitle}</p>
          <p className="text-xs font-semibold" style={{ color: payload[0].payload.color || '#22d3ee' }}>
            {payload[0].name}: {payload[0].value}{payload[0].name === 'Compliance Score' ? '%' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 relative z-10 pt-6 border-t border-white/5">
      
      {/* Donut Chart */}
      <div className="bg-black/20 border border-white/5 rounded-xl p-6 h-[280px] flex flex-col items-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <h3 className="text-zinc-300 text-sm font-semibold mb-2 flex items-center gap-2 self-start w-full">
          <PieChartIcon className="w-4 h-4 text-cyan-400" /> Requirement Distribution
        </h3>
        <div className="flex-1 w-full min-h-0 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={6}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-black/20 border border-white/5 rounded-xl p-6 h-[280px] flex flex-col relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <h3 className="text-zinc-300 text-sm font-semibold mb-2 flex items-center gap-2">
          <BarChartIcon className="w-4 h-4 text-cyan-400" /> Compliance by Policy
        </h3>
        <div className="flex-1 w-full min-h-0 text-xs mt-2 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" tick={{fill: '#71717a', fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis stroke="#71717a" tick={{fill: '#71717a', fontSize: 10}} axisLine={false} tickLine={false} domain={[0, 100]} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="score" name="Compliance Score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#34d399' : entry.score >= 50 ? '#fbbf24' : '#fb7185'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};


const PolicyCard = ({ policy, index }: { policy: any, index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const [deepAuditLoading, setDeepAuditLoading] = useState(false);
  const [deepAuditResult, setDeepAuditResult] = useState<any>(null);

  const statusColor = 
    policy.overall_status === 'Satisfied' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
    policy.overall_status === 'Partially Satisfied' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
    'text-rose-400 bg-rose-400/10 border-rose-400/20';

  const triggerDeepAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded) setExpanded(true);
    setDeepAuditLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/compliance/deep-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy_id: policy.policy_id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDeepAuditResult(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeepAuditLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card rounded-xl border border-white/5 overflow-hidden"
    >
      <div 
        className="p-6 cursor-pointer hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">{policy.policy_title}</h3>
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${statusColor}`}>
              {policy.overall_status}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> {policy.confidence}% Conf
            </span>
            
            {!deepAuditResult && (
              <button 
                onClick={triggerDeepAudit}
                disabled={deepAuditLoading}
                className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 border border-indigo-500/30 transition-all text-xs font-bold disabled:opacity-50 shadow-[0_0_10px_rgba(79,70,229,0.2)]"
              >
                {deepAuditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                {deepAuditLoading ? 'Running Deep Audit...' : 'Agentic Deep Audit'}
              </button>
            )}
          </div>
          <div className="flex gap-4 text-sm text-zinc-500">
            <span>{policy.summary?.total_requirements || 0} Requirements</span>
            <span>•</span>
            <span className="text-emerald-400/80">{policy.summary?.satisfied || 0} Satisfied</span>
            <span className="text-amber-400/80">{policy.summary?.partially_satisfied || 0} Partial</span>
            <span className="text-rose-400/80">{policy.summary?.not_satisfied || 0} Missing</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5">
          {expanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-black/20"
          >
            <div className="p-6 space-y-6">
              
              {deepAuditResult ? (
                <div className="space-y-6">
                  <div className="bg-zinc-900/80 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] -mr-10 -mt-10 rounded-full"></div>
                    <h4 className="text-indigo-400 font-bold mb-4 flex items-center gap-2">
                      <Bot className="w-5 h-5" /> Multi-Agent Debate Transcript
                    </h4>
                    <div className="space-y-4">
                      {deepAuditResult.transcript.map((msg: any, i: number) => (
                        <div key={i} className={`flex flex-col ${msg.agent === 'Legal Adversary' ? 'items-end' : 'items-start'}`}>
                          <span className={`text-xs font-semibold mb-1 ${msg.agent === 'Legal Adversary' ? 'text-rose-400' : 'text-blue-400'}`}>
                            {msg.agent}
                          </span>
                          <div className={`p-4 rounded-xl max-w-[85%] text-sm [&>p]:mb-2 last:[&>p]:mb-0 [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:mb-2 [&_strong]:font-bold ${
                            msg.agent === 'Legal Adversary' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-100' : 
                            msg.agent === 'Auditor' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100' :
                            'bg-indigo-500/10 border border-indigo-500/20 text-indigo-100'
                          }`}>
                            <ReactMarkdown>{msg.message}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Final Consensus Requirements</h4>
                    {deepAuditResult.final_evaluation.map((req: any, rIdx: number) => (
                      <RequirementRow key={rIdx} req={req} />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Requirements Audit</h4>
                    {policy.requirements?.map((req: any, rIdx: number) => (
                      <RequirementRow key={rIdx} req={req} />
                    ))}
                  </div>

                  {policy.next_actions && policy.next_actions.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5">
                      <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <Lightbulb className="w-4 h-4" /> Recommended Action Plan
                      </h4>
                      <ul className="space-y-3">
                        {policy.next_actions.map((action: string, aIdx: number) => (
                          <li key={aIdx} className="flex gap-3 text-zinc-300 text-sm bg-cyan-950/20 p-3 rounded-lg border border-cyan-900/30">
                            <div className="min-w-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2"></div>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const RequirementRow = ({ req }: { req: any }) => {
  const isSatisfied = req.status === 'Satisfied';
  const isPartial = req.status === 'Partially Satisfied';
  
  const Icon = isSatisfied ? CheckCircle2 : isPartial ? AlertTriangle : XCircle;
  const iconColor = isSatisfied ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-rose-400';
  const bgColor = isSatisfied ? 'bg-emerald-400/5' : isPartial ? 'bg-amber-400/5' : 'bg-rose-400/5';
  const borderColor = isSatisfied ? 'border-emerald-500/20' : isPartial ? 'border-amber-500/20' : 'border-rose-500/20';

  return (
    <div className={`p-4 rounded-xl border ${borderColor} ${bgColor}`}>
      <div className="flex gap-4">
        <div className="mt-1">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 space-y-3">
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">{req.requirement_id}</span>
              <span className={`text-xs font-semibold ${iconColor}`}>{req.status}</span>
              {req.confidence && (
                <span className="text-xs text-zinc-500">({req.confidence}% Conf)</span>
              )}
            </div>
            <p className="text-sm font-medium text-white">{req.requirement_text}</p>
          </div>

          {req.reasoning && (
            <div className="text-sm text-zinc-400 bg-black/40 p-3 rounded-lg border border-white/5">
              <span className="font-semibold text-zinc-300 mr-2">AI Reasoning:</span>
              {req.reasoning}
            </div>
          )}

          {req.supporting_evidence && req.supporting_evidence.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                <FileText className="w-3 h-3" /> Supporting Evidence
              </div>
              {req.supporting_evidence.map((ev: any, eIdx: number) => (
                <div key={eIdx} className="text-xs text-zinc-400 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                  <div className="text-cyan-400/80 font-medium mb-1">{ev.company_policy_title}</div>
                  <div className="italic border-l-2 border-zinc-700 pl-3 my-2">"{ev.evidence_snippet}"</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
