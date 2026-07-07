import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { API_URL } from '../../config';
import { Loader2, Download, ArrowLeft, Wand2, FileText } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

interface AutoFixerProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export const AutoFixer: React.FC<AutoFixerProps> = ({ onBack, onSuccess }) => {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remediatedData, setRemediatedData] = useState<any[]>([]);

  useEffect(() => {
    const runAutoFix = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/compliance/autofix`, {
          method: 'POST',
          headers: { 'X-User-ID': userId || 'anonymous' }
        });
        
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || 'Failed to run autofix process.');
        }

        const result = await response.json();
        setRemediatedData(result.data.remediated_categories || []);
        onSuccess?.();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    runAutoFix();
  }, [userId]);

  const handleDownload = (format: string) => {
    // Note: window.open for download won't easily support custom headers like X-User-ID.
    // Instead of window.open, we should use fetch if we need headers, but since the endpoint
    // reads the header, we MUST use fetch and blob.
    const downloadFile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/compliance/export-remediated?format=${format}`, {
          headers: { 'X-User-ID': userId || 'anonymous' }
        });
        if (!response.ok) throw new Error('Failed to export');
        const blob = await response.blob();
        let filename = `remediated_policies.${format}`;
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('filename=') !== -1) {
          const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch && filenameMatch.length === 2) filename = filenameMatch[1];
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
      } catch (err) {
        alert('Export failed');
      }
    };
    downloadFile();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8 relative overflow-hidden glow-border"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
        
        <div className="flex justify-between items-center relative z-10">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Report
            </button>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-fuchsia-400" />
              AI Policy Auto-Fixer
            </h2>
            <p className="text-zinc-400">
              The AI has rewritten your non-compliant policies to satisfy all missing requirements.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => handleDownload('docx')}
              disabled={loading || !!error || remediatedData.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> DOCX
            </button>
            <button 
              onClick={() => handleDownload('pdf')}
              disabled={loading || !!error || remediatedData.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={() => handleDownload('md')}
              disabled={loading || !!error || remediatedData.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium transition-colors shadow-[0_0_15px_rgba(192,38,211,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> MD
            </button>
            <button 
              onClick={() => handleDownload('json')}
              disabled={loading || !!error || remediatedData.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> JSON
            </button>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-fuchsia-500 blur-xl opacity-50 rounded-full"></div>
            <Loader2 className="w-16 h-16 text-fuchsia-400 animate-spin relative z-10" />
          </div>
          <p className="text-zinc-400 animate-pulse text-lg">AI is actively rewriting policies... This may take a minute to comply with LLM rate limits.</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-xl text-center">
          <p className="font-semibold text-lg mb-2">Auto-Fix Failed</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {remediatedData.map((categoryData, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-xl border border-white/5 overflow-hidden flex flex-col"
            >
              <div className="bg-white/[0.02] border-b border-white/5 p-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-fuchsia-400" />
                  {categoryData.category}
                </h3>
                <span className="bg-fuchsia-500/20 text-fuchsia-400 text-xs px-3 py-1 rounded-full font-semibold border border-fuchsia-500/30">
                  Fixed {categoryData.fixed_requirements_count} Missing Requirements
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 flex-1">
                {/* Original */}
                <div className="p-6 bg-rose-500/[0.02]">
                  <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    Original Policy Text
                  </h4>
                  <div className="text-sm text-zinc-400 whitespace-pre-wrap font-mono bg-black/40 p-4 rounded-lg border border-white/5 h-full min-h-[300px] overflow-auto">
                    {categoryData.original_text}
                  </div>
                </div>
                
                {/* Remediated */}
                <div className="p-6 bg-emerald-500/[0.02]">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    AI Remediated Policy
                  </h4>
                  <div className="text-sm text-zinc-300 bg-black/40 p-5 rounded-lg border border-emerald-500/20 h-full min-h-[300px] overflow-auto shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-emerald-400 mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-emerald-300 mb-3 mt-4" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-md font-bold text-emerald-200 mb-2 mt-3" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2 text-emerald-100/90 marker:text-emerald-500" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-emerald-100/90 marker:text-emerald-500" {...props} />,
                        li: ({node, ...props}) => <li className="" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-emerald-300" {...props} />,
                      }}
                    >
                      {categoryData.remediated_text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
