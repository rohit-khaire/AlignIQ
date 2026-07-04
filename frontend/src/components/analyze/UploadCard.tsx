import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, FileBadge2, FileCode2 } from 'lucide-react';

interface UploadCardProps {
  onFileSelect: (file: File) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div 
        className={`glass-card rounded-2xl p-1 relative overflow-hidden transition-all duration-300 ${
          isDragging ? 'glow-border' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors duration-300 flex flex-col items-center justify-center min-h-[320px] ${
          isDragging 
            ? 'border-cyan-400 bg-cyan-500/5' 
            : 'border-white/10 hover:border-white/20 bg-zinc-900/40'
        }`}>
          
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            onChange={handleChange}
            accept=".pdf"
          />
          
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center mb-6 shadow-xl border border-white/5">
            <UploadCloud className={`w-8 h-8 transition-colors duration-300 ${isDragging ? 'text-cyan-400' : 'text-zinc-400'}`} />
          </div>
          
          <h3 className="text-xl font-medium text-white mb-2">
            Drag & drop your policy document
          </h3>
          <p className="text-zinc-400 mb-8 max-w-sm mx-auto">
            Upload organizational guidelines in PDF format to analyze against enterprise compliance standards instantly.
          </p>
          
          <div className="flex gap-4 justify-center mb-8">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-white/5 text-xs text-zinc-500 font-medium">
              <FileBadge2 className="w-3.5 h-3.5" /> PDF
            </div>
          </div>
          
          <label 
            htmlFor="file-upload"
            className="px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-zinc-200 transition-colors cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            Browse Files
          </label>
        </div>
      </div>
    </motion.div>
  );
};
