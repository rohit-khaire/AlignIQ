import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ComplianceShield3D } from '../components/3d/ComplianceShield3D';
import { UploadCard } from '../components/analyze/UploadCard';
import { FilePreview } from '../components/analyze/FilePreview';
import { ProgressTracker } from '../components/analyze/ProgressTracker';
import { ReportDashboard } from '../components/analyze/ReportDashboard';
import { FeatureGrid } from '../components/layout/FeatureGrid';

type AnalyzeState = 'idle' | 'preview' | 'processing' | 'results';

export const Analyze: React.FC = () => {
  const [appState, setAppState] = useState<AnalyzeState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAppState('preview');
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setReportData([]);
    setError(null);
    setAppState('idle');
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    setAppState('processing');
    setError(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/compliance/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setReportData(data.report);
      setAppState('results');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
      setAppState('preview');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col pt-20">
      {/* Absolute 3D Background element - conditionally rendered or always present */}
      {(appState === 'idle' || appState === 'preview') && <ComplianceShield3D />}

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center justify-center min-h-[60vh]">
        
        {/* Header Text - only show in idle/preview */}
        <AnimatePresence mode="wait">
          {(appState === 'idle' || appState === 'preview') && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center mb-16"
            >
              <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 tracking-tight mb-6 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                AI Enterprise Compliance Analyzer
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
                Upload your organization's policies and instantly analyze compliance against enterprise standards using AI-powered reasoning.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* State Machine for Center Card */}
        <div className="w-full flex justify-center items-center">
          <AnimatePresence mode="wait">
            
            {appState === 'idle' && (
              <UploadCard key="upload" onFileSelect={handleFileSelect} />
            )}
            
            {appState === 'preview' && selectedFile && (
              <div className="w-full flex flex-col items-center">
                <FilePreview 
                  key="preview" 
                  file={selectedFile} 
                  onClear={handleClearFile} 
                  onAnalyze={handleAnalyze} 
                />
                {error && (
                  <div className="mt-6 text-rose-400 bg-rose-400/10 border border-rose-400/20 px-6 py-4 rounded-xl max-w-2xl w-full text-center">
                    <p className="font-semibold">Analysis Failed</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                )}
              </div>
            )}
            
            {appState === 'processing' && (
              <ProgressTracker key="processing" />
            )}
            
            {appState === 'results' && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
              >
                <ReportDashboard report={reportData} onReset={handleClearFile} />
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </div>

      {/* Feature Grid - only show in idle state */}
      <AnimatePresence>
        {appState === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FeatureGrid />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
