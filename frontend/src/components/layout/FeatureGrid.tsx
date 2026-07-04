import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Search, Database, FileKey2, FileCheck, Zap } from 'lucide-react';

const features = [
  {
    icon: BrainCircuit,
    title: "AI Policy Analysis",
    description: "Deep semantic reasoning against your internal documents.",
    color: "text-cyan-400"
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Vector-based retrieval ensures no hidden violations.",
    color: "text-blue-400"
  },
  {
    icon: Database,
    title: "Enterprise Knowledge",
    description: "Integrates with Pinecone for massive scale ingestion.",
    color: "text-purple-400"
  },
  {
    icon: FileKey2,
    title: "Explainable AI",
    description: "Every finding maps directly back to extracted evidence.",
    color: "text-emerald-400"
  },
  {
    icon: FileCheck,
    title: "Audit Ready Reports",
    description: "Generates beautiful JSON and PDF compliance reports.",
    color: "text-amber-400"
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Sub-second requirement extraction via Llama 3.",
    color: "text-rose-400"
  }
];

export const FeatureGrid: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto mt-32 relative z-10 pb-20">
      <div className="text-center mb-12">
        <h3 className="text-2xl font-bold text-white mb-3">Enterprise-Grade Architecture</h3>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          Built for scale, security, and precision. Our compliance engine leverages state-of-the-art LLMs to automate tedious auditing tasks.
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
  );
};
