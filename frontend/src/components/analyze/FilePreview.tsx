import React from 'react';
import { motion } from 'framer-motion';
import { FileText, X, ArrowRight } from 'lucide-react';

interface FilePreviewProps {
  file: File;
  onClear: () => void;
  onAnalyze: () => void;
}

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
      <div className="glass-card rounded-2xl p-8 relative glow-border">
        <button 
          onClick={onClear}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <FileText className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-medium text-white truncate mb-1">
              {file.name}
            </h3>
            <div className="flex gap-4 text-sm text-zinc-400">
              <span>{formatSize(file.size)}</span>
              <span>•</span>
              <span className="uppercase">{file.name.split('.').pop()} Document</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onAnalyze}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <span className="relative z-10">Run Enterprise Analysis</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};
