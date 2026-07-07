import React from 'react';
import { motion } from 'framer-motion';
import {
  BrainCircuit,
  Search,
  LineChart,
  Network,
  Wand2,
  MessageSquare,
  Briefcase,
  Bot,
  Shield,
  FileText,
  Globe,
  DollarSign,
} from 'lucide-react';

const features = [
  {
    icon: Briefcase,
    title: 'Consulting Replacement',
    description: 'Delivers $20K+ consulting deliverables — gap matrix, SOC 2/ISO mapping, phased roadmap, and cost savings analysis.',
    color: 'text-emerald-400',
    badge: 'New',
  },
  {
    icon: Bot,
    title: 'Multi-Agent Deep Audit',
    description: '4-agent debate: Auditor, Legal, CFO, and Lead Consultant find loopholes including profit-preserving acceptable risks.',
    color: 'text-indigo-400',
    badge: 'New',
  },
  {
    icon: FileText,
    title: 'Hybrid PDF Extraction',
    description: 'PyMuPDF layout parsing + regex fast-path + AI fallback structures enterprise policy manuals in seconds.',
    color: 'text-cyan-400',
  },
  {
    icon: Wand2,
    title: 'AI Policy Auto-Fixer',
    description: 'Automatically rewrites non-compliant policies and exports DOCX, PDF, or Markdown ready for deployment.',
    color: 'text-fuchsia-400',
  },
  {
    icon: Globe,
    title: 'Framework Mapping',
    description: 'SOC 2, ISO 27001, and NIST CSF control coverage with P0–P3 prioritized gap remediation.',
    color: 'text-blue-400',
  },
  {
    icon: Network,
    title: '3D Knowledge Graph',
    description: 'Interactive WebGL visualization of master policies, evidence links, and compliance hierarchy.',
    color: 'text-violet-400',
  },
  {
    icon: MessageSquare,
    title: 'Policy Oracle Chat',
    description: 'RAG-powered chatbot grounded in your uploaded policies and compliance report — ask anything.',
    color: 'text-emerald-400',
  },
  {
    icon: LineChart,
    title: 'CISO Analytics',
    description: 'Track compliance score trajectory over 30 days with SQLite telemetry and trend dashboards.',
    color: 'text-amber-400',
  },
  {
    icon: Search,
    title: 'Evidence-Linked Analysis',
    description: 'Every gap cites retrieved policy text via Pinecone semantic search — no ungrounded claims.',
    color: 'text-rose-400',
  },
  {
    icon: Shield,
    title: 'Executive Board Deck',
    description: 'Auto-generated presentation with risk exposures, remediation roadmap, and AI executive briefing.',
    color: 'text-cyan-300',
  },
  {
    icon: DollarSign,
    title: 'Profit-Preserving Loopholes',
    description: 'Identifies where strict remediation hurts revenue and recommends accept-risk or compensating controls.',
    color: 'text-yellow-400',
    badge: 'New',
  },
  {
    icon: BrainCircuit,
    title: 'Live Progress Tracking',
    description: 'Real-time pipeline updates during PDF extraction, indexing, and per-policy gap analysis.',
    color: 'text-purple-400',
    badge: 'New',
  },
];

export const FeatureGrid: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto mt-24 relative z-10 pb-20 space-y-24">

      {/* Business Benefits */}
      <div>
        <div className="text-center mb-12">
          <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4">
            Replace $15K+ Compliance Consulting
          </h3>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            AlignIQ extracts policies from PDFs, maps gaps to SOC 2 and ISO 27001, runs multi-agent loophole analysis, and delivers board-ready remediation roadmaps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-emerald-500/10 hover:border-emerald-500/30 transition-all hover:-translate-y-1">
            <div className="text-4xl font-black text-emerald-400 mb-2">$20K+</div>
            <div className="font-semibold text-white mb-2">Consulting Saved</div>
            <div className="text-sm text-zinc-400">40–80 consultant hours automated per assessment at Big-4 benchmark rates.</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-cyan-500/10 hover:border-cyan-500/30 transition-all hover:-translate-y-1">
            <div className="text-4xl font-black text-cyan-400 mb-2">~3 min</div>
            <div className="font-semibold text-white mb-2">PDF → Full Report</div>
            <div className="text-sm text-zinc-400">Hybrid extraction + parallel vector indexing + per-policy AI evaluation.</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-indigo-500/10 hover:border-indigo-500/30 transition-all hover:-translate-y-1">
            <div className="text-4xl font-black text-indigo-400 mb-2">3</div>
            <div className="font-semibold text-white mb-2">Frameworks Mapped</div>
            <div className="text-sm text-zinc-400">SOC 2, ISO 27001, and NIST CSF with P0–P3 gap prioritization.</div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div>
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-white mb-3">Platform Capabilities</h3>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Everything a compliance consulting engagement delivers — automated, evidence-linked, and deployment-ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 6) * 0.06, duration: 0.4 }}
              whileHover={{ y: -4 }}
              className="glass-card rounded-2xl p-6 group cursor-default relative overflow-hidden"
            >
              {feature.badge && (
                <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {feature.badge}
                </span>
              )}
              <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/5 group-hover:border-white/15 transition-colors">
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h4 className="text-base font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
