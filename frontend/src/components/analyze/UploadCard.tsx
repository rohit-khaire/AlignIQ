import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileBadge2 } from 'lucide-react';

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

  const validateAndSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file containing your company policies.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('PDF must be under 25MB.');
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
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
        className={`glass-card rounded-[21px] p-1 relative overflow-hidden transition-all duration-300 ${
          isDragging ? 'glow-border' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className={`border-2 border-dashed rounded-[17px] p-12 text-center transition-colors duration-300 flex flex-col items-center justify-center min-h-[320px] ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-muted-foreground/30 bg-card/40'
        }`}>
          
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            onChange={handleChange}
            accept=".pdf"
          />
          
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6 shadow-xl border border-border">
            <UploadCloud className={`w-8 h-8 transition-colors duration-300 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          
          <h3 className="text-xl font-medium text-foreground mb-2">
            Drag & drop your policy document
          </h3>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Upload organizational guidelines in PDF format to analyze against enterprise compliance standards instantly.
          </p>
          
          <div className="flex gap-3 justify-center mb-6 flex-wrap">
            {['PDF Extraction', 'SOC 2 Mapping', 'Multi-Agent Audit', 'Auto-Fix'].map((tag) => (
              <span key={tag} className="text-[10px] font-medium px-2.5 py-1 rounded-[21px] bg-primary/10 text-primary border border-primary/20">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex gap-4 justify-center mb-8">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[21px] bg-muted/50 border border-border text-xs text-muted-foreground font-medium">
              <FileBadge2 className="w-3.5 h-3.5" /> PDF
            </div>
          </div>
          
          <label 
            htmlFor="file-upload"
            className="px-6 py-3 rounded-[21px] bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all cursor-pointer shadow-md"
          >
            Browse Files
          </label>
        </div>
      </div>
    </motion.div>
  );
};
