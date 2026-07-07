import React, { useState, useEffect, useMemo } from 'react';
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
  Bot,
  Info,
  Presentation,
  ArrowRight,
  ArrowLeft,
  Kanban,
  Globe,
  DollarSign,
  Clock,
  Terminal,
  Briefcase
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

import { ChatOracle } from './ChatOracle';
import { KnowledgeGraph3D } from './KnowledgeGraph3D';
import { CisoDashboard } from './CisoDashboard';
import { MessageSquare, Network, TrendingUp, X } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

interface ReportDashboardProps {
  report: any[];
  consultingInsights?: any;
  extractionMetadata?: any;
  onReset: () => void;
  onAutoFix: () => void;
  autoFixPerformed?: boolean;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ report, consultingInsights, extractionMetadata, onReset, onAutoFix, autoFixPerformed = false }) => {
  const { userId } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);
  const [isOracleOpen, setIsOracleOpen] = useState(false);

  const gapItems = useMemo(() => {
    return report.flatMap((pol: any, polIdx: number) => pol.requirements.map((req: any, reqIdx: number) => ({
      id: `${pol.policy_id}-${req.requirement_id || reqIdx}-${polIdx}`,
      policy_id: pol.policy_id,
      title: pol.policy_title,
      category: pol.category || 'Engineering',
      risk_level: pol.master_policy_details?.risk_level || 'Medium',
      department: pol.master_policy_details?.department || 'Engineering',
      req_text: req.requirement_text,
      status: req.status,
      action: req.recommended_action || 'Needs review and remediation implementation.',
      score: req.risk_score || 0
    }))).filter((item: any) => item.status !== 'Satisfied').sort((a: any, b: any) => b.score - a.score);
  }, [report]);

  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    setTickets(gapItems.map(item => ({ ...item, col: 'todo', assignee: 'Unassigned' })));
  }, [gapItems]);

  const [viewMode, setViewMode] = useState<'dashboard' | 'graph' | 'ciso' | 'risk' | 'presentation' | 'roadmap' | 'frameworks'>('dashboard');

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
      const response = await fetch(`${API_URL}/api/v1/compliance/export?format=${format}`, {
        headers: { 'X-User-ID': userId || 'anonymous' }
      });
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

      {consultingInsights && (
        <ConsultingBrief insights={consultingInsights} extractionMetadata={extractionMetadata} />
      )}
      
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
        
        <div className="flex flex-col gap-6 relative z-10">
          {/* Top Row: Title & Score */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-cyan-400" />
                AlignIQ Compliance Report
              </h2>
              <p className="text-zinc-400 mb-0">Analysis completed across {totalPolicies} master policies.</p>
            </div>
            
            <div className="flex items-center gap-6 bg-zinc-900/50 p-4 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto custom-scrollbar">
              <div className="text-center px-4 border-r border-white/10 shrink-0">
                <div className="text-3xl font-bold text-white">{globalCompliance}%</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Score</div>
              </div>
              <div className="flex gap-4 shrink-0 pr-2">
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

          {/* Bottom Row: Tabs & Export */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 w-full overflow-x-auto custom-scrollbar pb-2">
            <div className="flex bg-zinc-900/80 p-1 rounded-lg border border-white/10 shrink-0">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'dashboard' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <BarChartIcon className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Dashboard</span>
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'graph' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Network className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">3D Graph</span>
              </button>
              <button
                onClick={() => setViewMode('risk')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'risk' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Risk Matrix</span>
              </button>
              <button
                onClick={() => setViewMode('presentation')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'presentation' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Presentation className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Exec Deck</span>
              </button>
              <button
                onClick={() => setViewMode('roadmap')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'roadmap' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Kanban className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Roadmap</span>
              </button>
              <button
                onClick={() => setViewMode('frameworks')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'frameworks' ? 'bg-cyan-900/50 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Globe className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Departments</span>
              </button>
            </div>

          </div>
        </div>

        {/* --- DYNAMIC VIEW SECTION --- */}
        {viewMode === 'dashboard' ? (
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10 space-y-6">
            <div className="flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => handleExport('json')}
                disabled={exporting !== null}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors border border-zinc-700 whitespace-nowrap"
              >
                {exporting === 'json' ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />} JSON
              </button>
              <button 
                onClick={() => handleExport('csv')}
                disabled={exporting !== null}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors border border-zinc-700 whitespace-nowrap"
              >
                {exporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />} CSV
              </button>
              <button 
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-900/40 text-cyan-400 text-sm hover:bg-cyan-900/60 transition-colors border border-cyan-800 whitespace-nowrap"
              >
                {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />} PDF
              </button>
            </div>
            <VisualAnalytics 
              satisfied={satisfiedReqs} 
              partial={partialReqs} 
              missing={notSatisfiedReqs} 
              report={report} 
            />
          </div>
        ) : viewMode === 'graph' ? (
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <KnowledgeGraph3D report={report} />
          </div>
        ) : viewMode === 'risk' ? (
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <RiskMatrix report={report} />
          </div>
        ) : viewMode === 'presentation' ? (
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <ExecutivePresentation report={report} globalCompliance={globalCompliance} satisfiedReqs={satisfiedReqs} partialReqs={partialReqs} notSatisfiedReqs={notSatisfiedReqs} tickets={tickets} autoFixPerformed={autoFixPerformed} consultingInsights={consultingInsights} />
          </div>
        ) : viewMode === 'roadmap' ? (
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <RemediationRoadmap report={report} tickets={tickets} setTickets={setTickets} />
          </div>
        ) : viewMode === 'frameworks' ? (
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <DepartmentalRiskExposure report={report} />
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

      {/* Categorized Policies List */}
      {viewMode === 'dashboard' && (
        <div className="space-y-12">
          {Object.entries(
            report.reduce((acc, pol) => {
              const cat = pol.category || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(pol);
              return acc;
            }, {} as Record<string, any[]>)
          ).map(([category, policies]: [string, any]) => {
            const catSatisfied = policies.reduce((acc: number, pol: any) => acc + (pol.summary?.satisfied || 0), 0);
            const catPartial = policies.reduce((acc: number, pol: any) => acc + (pol.summary?.partially_satisfied || 0), 0);
            const catMissing = policies.reduce((acc: number, pol: any) => acc + (pol.summary?.not_satisfied || 0), 0);
            
            return (
              <div key={category} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                  <h3 className="text-2xl font-bold text-cyan-400 flex items-center gap-3">
                    <FileText className="w-7 h-7" /> {category}
                  </h3>
                  <div className="flex gap-4 text-sm font-medium bg-zinc-900/50 px-4 py-2 rounded-lg border border-white/5">
                    <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="w-4 h-4"/> {catSatisfied} Satisfied</span>
                    <span className="flex items-center gap-1.5 text-amber-400"><AlertTriangle className="w-4 h-4"/> {catPartial} Partial</span>
                    <span className="flex items-center gap-1.5 text-rose-400"><XCircle className="w-4 h-4"/> {catMissing} Violations</span>
                  </div>
                </div>
                <div className="space-y-6 pl-0 sm:pl-4 sm:border-l-2 border-white/5">
                  {policies.map((policy: any, idx: number) => (
                    <PolicyCard key={policy.policy_id || idx} policy={policy} index={idx} />
                  ))}
                </div>
              </div>
            );
          })}
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
  const { userId } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [deepAuditLoading, setDeepAuditLoading] = useState(false);
  const [deepAuditError, setDeepAuditError] = useState<string | null>(null);
  const [deepAuditResult, setDeepAuditResult] = useState<any>(null);


  const statusColor = 
    policy.overall_status === 'Satisfied' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
    policy.overall_status === 'Partially Satisfied' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
    'text-rose-400 bg-rose-400/10 border-rose-400/20';

  const triggerDeepAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded) setExpanded(true);
    setDeepAuditLoading(true);
    setDeepAuditError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/compliance/deep-audit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': userId || 'anonymous'
        },
        body: JSON.stringify({ policy_id: policy.policy_id, force_refresh: !!deepAuditResult })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Deep audit failed');
      if (data.status === 'success') {
        setDeepAuditResult(data.data);
      }
    } catch (err: any) {
      setDeepAuditError(err.message || 'Deep audit failed. Please retry.');
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
            
            <button 
              onClick={triggerDeepAudit}
              disabled={deepAuditLoading}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 border border-indigo-500/30 transition-all text-xs font-bold disabled:opacity-50 shadow-[0_0_10px_rgba(79,70,229,0.2)]"
            >
              {deepAuditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {deepAuditLoading ? 'Agents Debating...' : deepAuditResult ? 'Re-run Deep Audit' : 'Multi-Agent Deep Audit'}
            </button>
          </div>
          <div className="flex gap-4 text-sm text-zinc-500">
            <span>{policy.summary?.total_requirements || 0} Requirements</span>
            <span>•</span>
            <span className="text-emerald-400/80">{policy.summary?.satisfied || 0} Satisfied</span>
            <span className="text-amber-400/80">{policy.summary?.partially_satisfied || 0} Partial</span>
            <span className="text-rose-400/80">{policy.summary?.not_satisfied || 0} Missing</span>
          </div>
          {expanded && policy.master_policy_details && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
              className="mt-4 flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-950/30 px-3 py-1.5 rounded-md border border-cyan-900/50"
            >
              <Info className="w-4 h-4" /> 
              {showDetails ? 'Hide Detailed Information' : 'Get Detailed Information'}
            </button>
          )}
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
              
              <AnimatePresence>
                {showDetails && policy.master_policy_details && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-cyan-950/20 border border-cyan-900/30 rounded-xl p-5 mb-6">
                      <h4 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Master Policy Details
                      </h4>
                      <p className="text-sm text-zinc-300 mb-4">{policy.master_policy_details.statement}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-zinc-500 uppercase tracking-wider block">Department</span>
                          <span className="text-zinc-200 font-medium">{policy.master_policy_details.department}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-zinc-500 uppercase tracking-wider block">Risk Level</span>
                          <span className="text-zinc-200 font-medium">{policy.master_policy_details.risk_level}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-zinc-500 uppercase tracking-wider block">Owner</span>
                          <span className="text-zinc-200 font-medium">{policy.master_policy_details.owner}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-zinc-500 uppercase tracking-wider block">Effective Date</span>
                          <span className="text-zinc-200 font-medium">{policy.master_policy_details.effective_date}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-cyan-900/30">
                        <span className="text-zinc-500 uppercase tracking-wider block text-xs mb-1">Business Objective</span>
                        <p className="text-xs text-zinc-300">{policy.master_policy_details.business_objective}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {deepAuditError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm">
                  {deepAuditError}
                </div>
              )}

              {deepAuditResult ? (
                <div className="space-y-6">
                  {deepAuditResult.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-rose-400">{deepAuditResult.summary.to_remediate}</div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">To Remediate</div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-amber-400">{deepAuditResult.summary.acceptable_risks}</div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Accept Risk</div>
                      </div>
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-cyan-400">{deepAuditResult.summary.compensating_controls}</div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Compensating Controls</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-emerald-400">{deepAuditResult.summary.profit_preserving_loopholes}</div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Profit-Preserving</div>
                      </div>
                    </div>
                  )}
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">{req.requirement_id}</span>
              <span className={`text-xs font-semibold ${iconColor}`}>{req.status}</span>
              {req.final_recommendation && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  req.final_recommendation === 'Accept Risk' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                  req.final_recommendation === 'Compensating Control' ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' :
                  'text-rose-400 bg-rose-400/10 border-rose-400/20'
                }`}>{req.final_recommendation}</span>
              )}
              {req.confidence && (
                <span className="text-xs text-zinc-500">({req.confidence}% Conf)</span>
              )}
            </div>
            <p className="text-sm font-medium text-white">{req.requirement_text}</p>
          </div>

          {req.reasoning && !req.boardroom_summary && (
            <div className="text-sm text-zinc-400 bg-black/40 p-3 rounded-lg border border-white/5">
              <span className="font-semibold text-zinc-300 mr-2">AI Reasoning:</span>
              {req.reasoning}
            </div>
          )}

          {/* Premium Executive Intelligence Block (Deep Audit Output) */}
          {req.status !== 'Satisfied' && (req.financial_risk_exposure || req.implementation_effort || req.boardroom_summary) && (
            <div className="mt-4 p-4 bg-gradient-to-br from-indigo-950/40 to-purple-900/20 border border-indigo-500/30 rounded-xl space-y-4 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 bg-indigo-500/20 rounded-bl-lg border-b border-l border-indigo-500/30">
                <span className="text-[9px] uppercase tracking-widest font-black text-indigo-300">Premium Analysis</span>
              </div>
              
              {req.boardroom_summary && (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">The Boardroom Summary</h5>
                    <p className="text-sm font-medium text-white leading-relaxed">"{req.boardroom_summary}"</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-indigo-500/20">
                {req.financial_risk_exposure && (
                  <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-rose-500/20">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                      <DollarSign className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Financial Risk Exposure</div>
                      <div className="text-sm font-bold text-rose-300">{req.financial_risk_exposure}</div>
                    </div>
                  </div>
                )}
                
                {req.implementation_effort && (
                  <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-cyan-500/20">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                      <Clock className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Implementation Effort</div>
                      <div className="text-sm font-bold text-cyan-300">{req.implementation_effort}</div>
                    </div>
                  </div>
                )}
              </div>

              {req.strategic_business_value && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-start gap-3 bg-black/40 p-3 rounded-lg border border-emerald-500/20">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Strategic Business Value</h5>
                      <p className="text-sm text-zinc-300 leading-relaxed">{req.strategic_business_value}</p>
                    </div>
                  </div>
                </div>
              )}

              {req.security_impact_analysis && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-start gap-3 bg-black/40 p-3 rounded-lg border border-fuchsia-500/20">
                    <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center border border-fuchsia-500/30 shrink-0">
                      <AlertTriangle className="w-4 h-4 text-fuchsia-400" />
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider mb-1">Deep Security Impact Analysis</h5>
                      <p className="text-sm text-zinc-300 leading-relaxed">{req.security_impact_analysis}</p>
                    </div>
                  </div>
                </div>
              )}

              {req.policy_loophole_identified && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-start gap-3 bg-rose-950/20 p-3 rounded-lg border border-rose-500/30">
                    <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <h5 className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1">Policy Loophole Identified</h5>
                      <p className="text-sm text-zinc-300 leading-relaxed">{req.policy_loophole_identified}</p>
                    </div>
                  </div>
                </div>
              )}

              {req.profit_preserving_loophole && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-start gap-3 bg-emerald-950/20 p-3 rounded-lg border border-emerald-500/30">
                    <DollarSign className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <h5 className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Profit-Preserving Loophole</h5>
                      <p className="text-sm text-zinc-300 leading-relaxed">{req.profit_preserving_loophole}</p>
                      {req.profit_impact_if_remediated && (
                        <p className="text-xs text-zinc-500 mt-2">If remediated strictly: {req.profit_impact_if_remediated}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {req.acceptable_risk_rationale && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-start gap-3 bg-amber-950/20 p-3 rounded-lg border border-amber-500/30">
                    <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <h5 className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                        {req.acceptable_risk ? 'Acceptable Risk — Keep Current Policy' : 'Risk Assessment'}
                      </h5>
                      <p className="text-sm text-zinc-300 leading-relaxed">{req.acceptable_risk_rationale}</p>
                      {(req.legal_position || req.business_position) && (
                        <div className="mt-2 space-y-1 text-xs text-zinc-500">
                          {req.legal_position && <p><span className="text-zinc-400">Legal:</span> {req.legal_position}</p>}
                          {req.business_position && <p><span className="text-zinc-400">Business:</span> {req.business_position}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {req.loophole_workaround && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-start gap-3 bg-amber-950/20 p-3 rounded-lg border border-amber-500/30">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">Policy Language Workaround</h5>
                      <p className="text-sm text-zinc-300 leading-relaxed italic">{req.loophole_workaround}</p>
                    </div>
                  </div>
                </div>
              )}

              {req.workaround_risk_warning && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-start gap-3 bg-red-950/40 p-3 rounded-lg border border-red-500/40">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40 shrink-0">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1">Critical Risk Warning</h5>
                      <p className="text-sm font-medium text-red-200/90 leading-relaxed">{req.workaround_risk_warning}</p>
                    </div>
                  </div>
                </div>
              )}

              {req.blast_radius && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-start gap-3 bg-black/40 p-3 rounded-lg border border-orange-500/20">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30 shrink-0">
                      <Network className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-orange-300 uppercase tracking-wider mb-1">Blast Radius & Dependency Exposure</h5>
                      <p className="text-sm text-zinc-300 leading-relaxed">{req.blast_radius}</p>
                    </div>
                  </div>
                </div>
              )}

              {req.auto_drafted_policy_patch && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> 1-Click Auto-Remediation: Policy Patch
                    </h5>
                    {req.target_document_placement && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
                        Paste into: {req.target_document_placement}
                      </span>
                    )}
                  </div>
                  <div className="bg-black/60 p-4 rounded-lg border border-emerald-500/30 text-sm text-emerald-100/90 font-serif leading-relaxed shadow-inner">
                    "{req.auto_drafted_policy_patch}"
                  </div>
                  <p className="text-[10px] text-emerald-400/60 mt-2 italic">* Drafted by AlignIQ Legal AI. Ready to copy-paste to instantly satisfy requirement.</p>
                </div>
              )}

              {req.step_by_step_runbook && Array.isArray(req.step_by_step_runbook) && req.step_by_step_runbook.length > 0 && (
                <div className="pt-3 border-t border-indigo-500/20">
                  <h5 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Micro-Remediation Engineering Runbook
                  </h5>
                  <div className="space-y-2">
                    {req.step_by_step_runbook.map((step: string, idx: number) => (
                      <div key={idx} className="flex gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-zinc-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {req.supporting_evidence && req.supporting_evidence.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                <FileText className="w-3 h-3" /> Supporting Evidence
              </div>
              {req.supporting_evidence.map((ev: any, eIdx: number) => (
                <div key={eIdx} className="text-xs text-zinc-400 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                  <div className="text-cyan-400/80 font-medium mb-1">{ev.company_policy_title || ev.title || ev.company_policy_id || 'Policy Evidence'}</div>
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

const RiskMatrix = ({ report }: { report: any[] }) => {
  const riskItems = report.flatMap(pol => {
    return pol.requirements.map((req: any) => ({
      policy_id: pol.policy_id,
      title: pol.policy_title,
      risk_level: pol.master_policy_details?.risk_level || 'Medium',
      req_text: req.requirement_text,
      status: req.status,
      score: req.risk_score || 0
    }));
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-black/20 border border-white/5 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" /> Strategic Risk Prioritization
          </h3>
          <p className="text-sm text-zinc-400 mb-6">
            Identified compliance gaps prioritized by business impact and exposure likelihood. Address critical items immediately to mitigate regulatory and financial risk.
          </p>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {riskItems.map((item, idx) => (
              <div key={idx} className="bg-zinc-900/60 border border-white/5 p-4 rounded-lg flex items-start gap-4">
                <div className={`mt-1 flex-shrink-0 w-12 h-12 rounded-full flex flex-col items-center justify-center border ${
                  item.score >= 12 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                  item.score >= 6 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                }`}>
                  <span className="text-[8px] font-black uppercase opacity-60 mb-[-2px]">Score</span>
                  <span className="font-bold text-sm">{item.score}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-zinc-500 bg-black px-2 py-0.5 rounded">{item.policy_id}</span>
                    <span className="text-sm font-semibold text-white">{item.title}</span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{item.req_text}</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-white/5">
                      Impact: {item.risk_level}
                    </span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                      item.status === 'Not Satisfied' ? 'text-rose-400 bg-rose-400/10 border-rose-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                    }`}>
                      Gap: {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {riskItems.length === 0 && (
              <div className="text-center p-8 text-emerald-400 font-medium">
                No active compliance risks identified.
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-black/20 border border-white/5 rounded-xl p-6 relative">
            <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">Risk Exposure</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-rose-400 font-semibold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Critical (Score 12+)</span>
                <span className="text-white font-bold">{riskItems.filter(i => i.score >= 12).length}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-amber-400 font-semibold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div> High (Score 6-11)</span>
                <span className="text-white font-bold">{riskItems.filter(i => i.score >= 6 && i.score < 12).length}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-yellow-400 font-semibold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Medium (Score {"<"} 6)</span>
                <span className="text-white font-bold">{riskItems.filter(i => i.score < 6).length}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-xl p-6">
            <h4 className="text-indigo-300 font-bold mb-2">Consultant Insight</h4>
            <p className="text-xs text-indigo-100/70 leading-relaxed">
              Risk scores are strictly calculated by the backend mathematically (Master Policy Impact × Implementation Gap Severity). No AI hallucination is possible. Focus engineering efforts on scores 12 and above first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConsultingBrief = ({ insights, extractionMetadata }: { insights: any; extractionMetadata?: any }) => {
  const replacement = insights.consulting_replacement || {};
  const briefing = insights.executive_briefing || {};
  const frameworks = insights.framework_coverage || {};
  const gapSummary = insights.gap_summary_by_priority || {};
  const companyName = insights.company_name && insights.company_name !== 'Unknown Company' ? insights.company_name : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-zinc-900/80 to-cyan-950/20 p-6 space-y-5"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
            <Briefcase className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{companyName ? `${companyName} — ` : ''}Consulting Replacement Deliverable</h3>
            <p className="text-xs text-zinc-400">Big-4 grade audit output — generated in minutes, not weeks</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-center">
            <div className="text-2xl font-black text-emerald-400">${replacement.cost_savings_usd?.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Consulting Cost Avoided</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-center">
            <div className="text-2xl font-black text-cyan-400">{insights.audit_readiness_score}%</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Audit Readiness</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-center">
            <div className="text-2xl font-black text-amber-400">{replacement.time_savings_hours}h</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Time Saved</div>
          </div>
        </div>
      </div>

      {briefing.headline && (
        <p className="text-sm text-zinc-300 border-l-2 border-emerald-500/50 pl-4">{briefing.headline}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {Object.entries(frameworks).map(([key, fw]: [string, any]) => {
          const hasData = fw.coverage_pct !== null && fw.coverage_pct !== undefined;
          return (
            <div key={key} className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                {fw.name || key}
                <span className="cursor-help" title={`Coverage of ${fw.name || key} controls that map to your analyzed master policies. Only controls relevant to your policy scope are counted.`}>
                  <Info className="w-3 h-3 text-zinc-600" />
                </span>
              </div>
              {hasData ? (
                <>
                  <div className="text-xl font-bold text-white">{fw.coverage_pct}%</div>
                  <div className="text-[10px] text-zinc-500">{fw.controls_satisfied}/{fw.controls_in_scope} mapped controls satisfied</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-zinc-600">N/A</div>
                  <div className="text-[10px] text-zinc-600" title={fw.note || 'No mapped controls found'}>No policies in scope</div>
                </>
              )}
            </div>
          );
        })}
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            Gap Priority
            <span className="cursor-help" title="P0 = Critical (Not Satisfied + High/Critical risk)&#10;P1 = High (Not Satisfied or Partial + High risk)&#10;P2 = Medium (Partial gaps with moderate risk)">
              <Info className="w-3 h-3 text-zinc-600" />
            </span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-rose-400 font-bold" title="Critical — Requires immediate action">P0 Critical: {gapSummary.P0_critical || 0}</span>
            <span className="text-amber-400 font-bold" title="High priority gaps">P1 High: {gapSummary.P1_high || 0}</span>
            <span className="text-zinc-400" title="Medium priority gaps">P2 Med: {gapSummary.P2_medium || 0}</span>
          </div>
        </div>
      </div>

      {extractionMetadata && (
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <Terminal className="w-3 h-3" />
          {extractionMetadata.declared_count
            ? `${extractionMetadata.declared_count} policies declared in document`
            : `${extractionMetadata.extracted_count || extractionMetadata.total_policies || insights.summary?.policies_analyzed} policies extracted`
          }
          {extractionMetadata.extraction_time_seconds && ` in ${extractionMetadata.extraction_time_seconds}s`}
          {extractionMetadata.regex_coverage_pct > 0 && ` (${extractionMetadata.regex_coverage_pct}% regex fast-path)`}
        </div>
      )}
    </motion.div>
  );
};

const ExecutivePresentation = ({ report, globalCompliance, satisfiedReqs, partialReqs, notSatisfiedReqs, tickets = [], autoFixPerformed = false, consultingInsights }: any) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { userId } = useAuth();
  const [execInsights, setExecInsights] = useState<any>(consultingInsights?.executive_briefing || null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/compliance/exec-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-ID': userId || 'anonymous' },
          body: JSON.stringify({
            globalCompliance,
            notSatisfiedReqs,
            partialReqs,
            tickets_todo: tickets.filter((t: any) => t.col === 'todo').length,
            tickets_inprogress: tickets.filter((t: any) => t.col === 'inProgress').length,
            tickets_done: tickets.filter((t: any) => t.col === 'done').length,
            autoFixPerformed,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setExecInsights({ ...consultingInsights?.executive_briefing, ...data.insights });
        }
      } catch {
        /* keep deterministic briefing */
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [globalCompliance, notSatisfiedReqs, partialReqs, tickets, autoFixPerformed, userId]);

  const riskItems = report.flatMap((pol: any) => pol.requirements.map((req: any) => ({
    title: pol.policy_title,
    risk_level: pol.master_policy_details?.risk_level || 'Medium',
    req_text: req.requirement_text,
    status: req.status,
    score: req.risk_score || 0
  }))).filter((item: any) => item.score > 0).sort((a: any, b: any) => b.score - a.score);

  const criticalRisks = riskItems.filter((i: any) => i.score >= 12).slice(0, 3);
  
  const topRecommendations = useMemo(() => {
    return Array.from(new Set(tickets.map((t: any) => t.action)))
      .filter((action: any) => typeof action === 'string' && action.trim() !== '' && action !== 'Needs review and remediation implementation.')
      .slice(0, 4);
  }, [tickets]);
  
  const slides = [
    // Slide 1: Title
    <div key="slide-1" className="flex flex-col items-center justify-center h-full text-center space-y-6">
      <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-400/30 mb-4">
        <ShieldCheck className="w-10 h-10 text-cyan-400" />
      </div>
      <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Board of Directors <br/><span className="text-cyan-400">Compliance Briefing</span></h2>
      <p className="text-xl text-zinc-400 max-w-2xl">Automated Executive Strategy Presentation generated by AlignIQ Consultant AI.</p>
      <div className="mt-8 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-zinc-300">
        Confidential & Proprietary • {new Date().toLocaleDateString()}
      </div>
    </div>,

    // Slide 2: Executive Summary
    <div key="slide-2" className="flex flex-col h-full space-y-8 px-8">
      <h3 className="text-3xl font-bold text-white flex items-center gap-3">
        <PieChart className="w-8 h-8 text-cyan-400" /> Executive Summary
      </h3>
      {execInsights && (
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-5 space-y-2">
          {loadingInsights && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
          <p className="text-cyan-100 text-sm font-medium">{execInsights.executive_summary || execInsights.headline}</p>
          {execInsights.aligniq_value && <p className="text-zinc-400 text-xs">{execInsights.aligniq_value}</p>}
          {execInsights.aligniq_advantage && <p className="text-zinc-400 text-xs">{execInsights.aligniq_advantage}</p>}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        <div className="bg-black/30 border border-white/10 rounded-2xl p-8 flex flex-col justify-center items-center text-center">
          <div className="text-6xl font-black text-cyan-400 mb-2">{globalCompliance}%</div>
          <div className="text-lg font-medium text-zinc-300 uppercase tracking-widest">Global Readiness Score</div>
          <p className="mt-4 text-zinc-400 text-sm max-w-xs">
            Overall compliance posture across {report.length} master policies.
          </p>
        </div>
        <div className="space-y-4 flex flex-col justify-center">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex justify-between items-center">
            <span className="text-lg text-emerald-100 font-semibold">Satisfied Controls</span>
            <span className="text-2xl font-bold text-emerald-400">{satisfiedReqs}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 flex justify-between items-center">
            <span className="text-lg text-amber-100 font-semibold">Partial Gaps</span>
            <span className="text-2xl font-bold text-amber-400">{partialReqs}</span>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 flex justify-between items-center">
            <span className="text-lg text-rose-100 font-semibold">Critical Violations</span>
            <span className="text-2xl font-bold text-rose-400">{notSatisfiedReqs}</span>
          </div>
        </div>
      </div>
    </div>,

    // Slide 3: Top Critical Risks
    <div key="slide-3" className="flex flex-col h-full space-y-6 px-8">
      <h3 className="text-3xl font-bold text-white flex items-center gap-3">
        <AlertTriangle className="w-8 h-8 text-rose-400" /> Top Critical Risk Exposures
      </h3>
      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
        {criticalRisks.length > 0 ? criticalRisks.map((risk: any, i: number) => (
          <div key={i} className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-6 flex gap-6 items-start">
            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center font-bold text-rose-400 shrink-0">
              #{i+1}
            </div>
            <div>
              <h4 className="text-lg font-bold text-rose-200 mb-2">{risk.title}</h4>
              <p className="text-zinc-300 text-sm mb-3">{risk.req_text}</p>
              <div className="flex gap-3 text-xs font-bold uppercase tracking-wider">
                <span className="px-2 py-1 rounded bg-black/40 text-rose-400 border border-rose-500/30">Impact: {risk.risk_level}</span>
                <span className="px-2 py-1 rounded bg-black/40 text-rose-400 border border-rose-500/30">Status: {risk.status}</span>
              </div>
            </div>
          </div>
        )) : (
          <div className="h-full flex items-center justify-center text-emerald-400 text-xl font-medium">
            <CheckCircle2 className="w-8 h-8 mr-3" /> No critical risks identified!
          </div>
        )}
      </div>
    </div>,

    // Slide 4: Roadmap
    <div key="slide-4" className="flex flex-col h-full space-y-6 px-8">
      <h3 className="text-3xl font-bold text-white flex items-center gap-3">
        <TrendingUp className="w-8 h-8 text-indigo-400" /> Strategic Remediation Roadmap
      </h3>
      <div className="flex-1 flex gap-4">
        <div className="flex-1 bg-black/20 border border-indigo-500/20 rounded-xl p-6">
          <h4 className="text-indigo-300 font-bold mb-4 uppercase tracking-wider text-sm border-b border-indigo-500/20 pb-2">Phase 1: Immediate Action</h4>
          <ul className="space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[250px]">
            {criticalRisks.length > 0 ? (
              criticalRisks.map((risk: any, idx: number) => (
                <li key={idx} className="flex gap-3 text-zinc-300 text-sm">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">Resolve Critical Risk: {risk.title}</span>
                </li>
              ))
            ) : (
              <li className="flex gap-3 text-zinc-300 text-sm"><div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> No critical risks identified. Maintain current posture.</li>
            )}
          </ul>
        </div>
        <div className="flex-1 bg-black/20 border border-purple-500/20 rounded-xl p-6">
          <h4 className="text-purple-300 font-bold mb-4 uppercase tracking-wider text-sm border-b border-purple-500/20 pb-2">Phase 2: Targeted Engineering Actions</h4>
          <ul className="space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[250px]">
            {topRecommendations.length > 0 ? (
              topRecommendations.map((action: any, idx: number) => (
                <li key={idx} className="flex gap-3 text-zinc-300 text-sm">
                  <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex gap-3 text-zinc-300 text-sm"><div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" /> Address {partialReqs} Partially Satisfied Gaps.</li>
                <li className="flex gap-3 text-zinc-300 text-sm"><div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" /> Run Agentic Deep Audit on updated policies.</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>,

    // Slide 5: Live Remediation Operations (Jira Sync)
    <div key="slide-5" className="flex flex-col h-full space-y-6 px-8">
      <h3 className="text-3xl font-bold text-white flex items-center gap-3">
        <Kanban className="w-8 h-8 text-blue-400" /> Live Remediation Operations
      </h3>
      <p className="text-zinc-400 max-w-2xl">Remediation progress tracked in your AlignIQ compliance roadmap.</p>
      <div className="flex-1 flex gap-4 mt-4">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col justify-center items-center text-center">
          <div className="text-5xl font-black text-white mb-2">{tickets.filter((t:any) => t.col === 'todo').length}</div>
          <div className="text-sm font-medium text-zinc-400 uppercase tracking-widest">To Do</div>
        </div>
        <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 flex flex-col justify-center items-center text-center">
          <div className="text-5xl font-black text-amber-400 mb-2">{tickets.filter((t:any) => t.col === 'inProgress').length}</div>
          <div className="text-sm font-medium text-amber-200 uppercase tracking-widest">In Progress</div>
        </div>
        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col justify-center items-center text-center">
          <div className="text-5xl font-black text-emerald-400 mb-2">{tickets.filter((t:any) => t.col === 'done').length}</div>
          <div className="text-sm font-medium text-emerald-200 uppercase tracking-widest">Completed</div>
        </div>
      </div>
    </div>,

    // Slide 6: AlignIQ Logo
    <div key="slide-6" className="flex flex-col h-full items-center justify-center p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black opacity-50 rounded-2xl pointer-events-none" />
      <img src="/AlignIQ-Logo.png" alt="AlignIQ" className="w-96 relative z-10 opacity-90 drop-shadow-[0_0_30px_rgba(34,211,238,0.2)]" />
      <p className="text-zinc-500 mt-8 font-medium tracking-widest uppercase relative z-10">Intelligent Compliance Remediation</p>
    </div>
  ];

  return (
    <div className="h-[600px] w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-2xl border border-white/10 overflow-hidden flex flex-col relative shadow-2xl">
      <div className="flex-1 relative p-8 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full min-h-0 overflow-y-auto custom-scrollbar"
          >
            {slides[currentSlide]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-20 bg-black/50 border-t border-white/5 flex items-center justify-between px-8 z-10 relative">
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? 'bg-cyan-400' : 'bg-zinc-700'}`} />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-zinc-500 font-medium text-sm">Slide {currentSlide + 1} of {slides.length}</span>
          <button 
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors text-white"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const RemediationRoadmap = ({ tickets, setTickets }: { report: any[], tickets: any[], setTickets: any }) => {
  const todo = tickets.filter(t => t.col === 'todo');
  const inProgress = tickets.filter(t => t.col === 'inProgress');
  const done = tickets.filter(t => t.col === 'done');

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('ticketId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('ticketId');
    setTickets((prev: any[]) => prev.map((t: any) => 
      t.id === ticketId ? { ...t, col } : t
    ));
  };

  const handleAssign = (id: string, assignee: string) => {
    setTickets((prev: any[]) => prev.map((t: any) => 
      t.id === id ? { ...t, assignee } : t
    ));
  };

  const exportToCSV = () => {
    const headers = ['Issue Type', 'Summary', 'Description', 'Priority', 'Assignee', 'Status', 'Risk Score'];
    const rows = tickets.map(t => {
      const priorityMap: Record<string, string> = { 'Critical': 'Highest', 'High': 'High', 'Medium': 'Medium', 'Low': 'Low' };
      const priority = priorityMap[t.risk_level] || 'Medium';
      const statusMap: Record<string, string> = { 'todo': 'To Do', 'inProgress': 'In Progress', 'done': 'Done' };
      
      // Escape quotes for CSV
      const summary = `"${t.title.replace(/"/g, '""')}"`;
      const description = `"${t.action.replace(/"/g, '""')}"`;

      return ['Task', summary, description, priority, t.assignee, statusMap[t.col], t.score].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'remediation_roadmap.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTicket = (item: any, idx: number) => (
    <div 
      key={idx} 
      draggable
      onDragStart={(e) => handleDragStart(e, item.id)}
      className="bg-zinc-900/80 border border-white/10 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:border-cyan-500/50 hover:bg-zinc-900 transition-all shadow-lg group"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-zinc-400 bg-black px-2 py-0.5 rounded">{item.policy_id}</span>
        <div className={`w-2 h-2 rounded-full ${item.score >= 12 ? 'bg-rose-500' : item.score >= 6 ? 'bg-amber-500' : 'bg-yellow-500'}`} />
      </div>
      <h5 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">{item.req_text}</h5>
      
      <div className="flex gap-2 mb-3">
        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
          {item.department}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
          {item.risk_level} Risk
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-zinc-400">
        <span className="text-zinc-500 mb-1 block uppercase tracking-wider text-[9px] font-bold">Action Item</span>
        <p className="line-clamp-2">{item.action}</p>
      </div>

      <div className="mt-3 flex justify-between items-center text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-cyan-900 flex items-center justify-center text-[10px] text-cyan-400 font-bold border border-cyan-700/50">
            {item.assignee === 'Unassigned' ? '?' : item.assignee.substring(0, 2).toUpperCase()}
          </div>
          <select 
            value={item.assignee}
            onChange={(e) => handleAssign(item.id, e.target.value)}
            className="bg-transparent text-zinc-300 font-medium text-xs border-none outline-none cursor-pointer hover:text-cyan-400 transition-colors focus:ring-0"
            onClick={(e) => e.stopPropagation()} // Prevent drag when clicking select
          >
            <option value="Unassigned" className="bg-zinc-900">Unassigned</option>
            <option value="SecOps Team" className="bg-zinc-900">SecOps Team</option>
            <option value="DevOps Team" className="bg-zinc-900">DevOps Team</option>
            <option value="Legal Team" className="bg-zinc-900">Legal Team</option>
            <option value="IT Support" className="bg-zinc-900">IT Support</option>
          </select>
        </div>
        <span className="text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">Risk Score: {item.score}</span>
      </div>
    </div>
  );

  return (
    <div className="h-[700px] flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Kanban className="w-6 h-6 text-indigo-400" /> Actionable Remediation Roadmap
          </h3>
          <p className="text-sm text-zinc-400 mt-1">Generated JIRA-style tickets prioritized by business impact and risk severity.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="px-4 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export to JIRA CSV
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* To Do Column */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'todo')}
          className="flex-1 bg-black/20 border border-white/5 rounded-xl flex flex-col overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h4 className="font-bold text-zinc-300">To Do</h4>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold">{todo.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {todo.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 font-medium">Empty</div>
            ) : (
              todo.map((item, idx) => renderTicket(item, idx))
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'inProgress')}
          className="flex-1 bg-black/20 border border-white/5 rounded-xl flex flex-col overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h4 className="font-bold text-zinc-300">In Progress</h4>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold">{inProgress.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {inProgress.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 font-medium">Drag tickets here</div>
            ) : (
              inProgress.map((item, idx) => renderTicket(item, idx))
            )}
          </div>
        </div>

        {/* Done Column */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'done')}
          className="flex-1 bg-black/20 border border-white/5 rounded-xl flex flex-col overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h4 className="font-bold text-zinc-300">Done</h4>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold">{done.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {done.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 font-medium">Completed tasks appear here</div>
            ) : (
              done.map((item, idx) => renderTicket(item, idx))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DepartmentalRiskExposure = ({ report }: { report: any[] }) => {
  // Aggregate data by department
  const deptStats: Record<string, { total: number; passed: number; failed: number; highRiskFails: number; totalRiskScore: number; maxPossibleRisk: number }> = {};

  const gapWeights: any = { 'Not Satisfied': 4, 'Partially Satisfied': 2, 'Satisfied': 0 };
  const riskMultipliers: any = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };

  report.forEach(pol => {
    const dept = pol.master_policy_details?.department || 'General Operations';
    if (!deptStats[dept]) {
      deptStats[dept] = { total: 0, passed: 0, failed: 0, highRiskFails: 0, totalRiskScore: 0, maxPossibleRisk: 0 };
    }

    const baseRisk = riskMultipliers[pol.master_policy_details?.risk_level || 'Medium'] || 2;

    pol.requirements.forEach((req: any) => {
      deptStats[dept].total += 1;
      deptStats[dept].maxPossibleRisk += (baseRisk * 4); // Max gap weight is 4

      const gapWeight = gapWeights[req.status || 'Satisfied'] || 0;
      const reqRisk = baseRisk * gapWeight;
      deptStats[dept].totalRiskScore += reqRisk;

      if (req.status === 'Satisfied') {
        deptStats[dept].passed += 1;
      } else {
        deptStats[dept].failed += 1;
        if (baseRisk >= 3) {
          deptStats[dept].highRiskFails += 1;
        }
      }
    });
  });

  const depts = Object.entries(deptStats)
    .map(([name, stats]) => ({
      name,
      ...stats,
      complianceScore: Math.round((stats.passed / stats.total) * 100) || 0,
      riskSeverityScore: Math.round((stats.totalRiskScore / stats.maxPossibleRisk) * 100) || 0
    }))
    .sort((a, b) => b.riskSeverityScore - a.riskSeverityScore); // Show highest risk departments first

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <Globe className="w-6 h-6 text-emerald-400" /> Departmental Risk Exposure
        </h3>
        <p className="text-sm text-zinc-400">Real-time compliance health breakdown by internal organization.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {depts.map((dept, idx) => (
          <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h4 className="text-lg font-bold text-white truncate pr-4">{dept.name}</h4>
              <div className="text-right">
                <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Risk Severity</div>
                <span className={`text-2xl font-black shrink-0 ${dept.riskSeverityScore > 60 ? 'text-rose-500' : dept.riskSeverityScore > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {dept.riskSeverityScore}/100
                </span>
              </div>
            </div>
            
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden mb-6 border border-white/5 relative z-10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${dept.riskSeverityScore}%` }}
                className={`h-full ${dept.riskSeverityScore > 60 ? 'bg-rose-500' : dept.riskSeverityScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 relative z-10">
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 text-center">
                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Total Reqs</div>
                <div className="text-lg font-semibold text-zinc-300">{dept.total}</div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 text-center">
                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Failed</div>
                <div className="text-lg font-semibold text-amber-400">{dept.failed}</div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-rose-500/20 text-center">
                <div className="text-[10px] text-rose-500/70 uppercase font-bold tracking-wider mb-1">High Risk</div>
                <div className="text-lg font-semibold text-rose-400">{dept.highRiskFails}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

