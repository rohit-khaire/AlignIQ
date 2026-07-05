import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Search, LineChart, Network, Wand2, MessageSquare } from 'lucide-react';

const features = [
  {
    icon: Wand2,
    title: "AI Policy Auto-Fixer",
    description: "Instantly rewrite non-compliant policies with our Llama 3 engine.",
    color: "text-fuchsia-400"
  },
  {
    icon: Network,
    title: "3D Knowledge Graph",
    description: "Visualize policy hierarchies and evidence connections in interactive WebGL.",
    color: "text-blue-400"
  },
  {
    icon: LineChart,
    title: "CISO Analytics",
    description: "Track your 30-day compliance trajectory with native SQLite history.",
    color: "text-cyan-400"
  },
  {
    icon: MessageSquare,
    title: "Chat Oracle",
    description: "Ask a floating RAG chatbot anything about your compliance posture.",
    color: "text-emerald-400"
  },
  {
    icon: Search,
    title: "Semantic Analysis",
    description: "Vector-based retrieval via Pinecone ensures no hidden violations.",
    color: "text-amber-400"
  },
  {
    icon: BrainCircuit,
    title: "Explainable Findings",
    description: "Every metric maps directly back to extracted document evidence.",
    color: "text-purple-400"
  }
];

export const FeatureGrid: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto mt-24 relative z-10 pb-20 space-y-32">
      
      {/* Business Benefits Section */}
      <div>
        <div className="text-center mb-12">
          <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4">
            Why Enterprise Leaders Choose AlignIQ
          </h3>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Stop wasting thousands of hours on manual compliance audits. AlignIQ transforms your governance workflow into an instant, automated, and mathematically precise pipeline.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
            <div className="text-4xl font-black text-emerald-400 mb-2">90%</div>
            <div className="font-semibold text-white mb-2">Faster Audits</div>
            <div className="text-sm text-zinc-400">What took weeks of manual reading now takes seconds. Instantly identify and auto-fix policy gaps.</div>
          </div>
          
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-cyan-500/10 hover:border-cyan-500/30 transition-colors">
            <div className="text-4xl font-black text-cyan-400 mb-2">Zero</div>
            <div className="font-semibold text-white mb-2">Hallucinations</div>
            <div className="text-sm text-zinc-400">Multi-Agent debates and Semantic RAG retrieval ensure every claim is backed by cited, verifiable internal evidence.</div>
          </div>
          
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-indigo-500/10 hover:border-indigo-500/30 transition-colors">
            <div className="text-4xl font-black text-indigo-400 mb-2">100%</div>
            <div className="font-semibold text-white mb-2">Enterprise Ready</div>
            <div className="text-sm text-zinc-400">Built for scale. Secure local embedding models and robust SQLite telemetry keep your data strictly confidential.</div>
          </div>
        </div>
      </div>

      {/* Technical Features Section */}
      <div>
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-white mb-3">State-of-the-Art Features</h3>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            AlignIQ combines multi-agent LLM reasoning, immersive 3D visualizations, and persistent analytics to completely automate your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -5 }}
            className="glass-card rounded-2xl p-6 group cursor-default"
          >
            <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-5 border border-white/5 group-hover:border-white/10 transition-colors`}>
              <feature.icon className={`w-6 h-6 ${feature.color}`} />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
        </div>
      </div>
    </div>
  );
};
