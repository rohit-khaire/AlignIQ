import React from 'react';
import { motion } from 'framer-motion';
import { FileText, X, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface FilePreviewProps {
  file: File;
  onClear: () => void;
  onAnalyze: () => void;
}

const PIPELINE_STEPS = [
  'Extract text from PDF (PyMuPDF)',
  'Structure policies (regex + AI)',
  'Index in vector knowledge base',
  'Analyze master compliance policies',
  'Generate consulting deliverable',
];

export const FilePreview: React.FC<FilePreviewProps> = ({ file, onClear, onAnalyze }) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="glass-card rounded-[21px] p-8 relative glow-border">
        <button
          onClick={onClear}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-6 mb-6">
          <div className="w-16 h-16 rounded-[21px] bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_var(--color-primary)]">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-medium text-foreground truncate mb-1">{file.name}</h3>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{formatSize(file.size)}</span>
              <span>•</span>
              <span className="uppercase">PDF Document</span>
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-[21px] bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Automated pipeline</span>
          </div>
          <ul className="space-y-2">
            {PIPELINE_STEPS.map((step, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground opacity-60 shrink-0" />
                {step}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground/70 mt-3">Live progress updates shown during analysis · typically 2–5 minutes</p>
        </div>

        <button
          onClick={onAnalyze}
          className="w-full py-4 rounded-[21px] bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-300 shadow-[0_0_20px_var(--color-primary)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <span className="relative z-10">Run AlignIQ Analysis</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};
