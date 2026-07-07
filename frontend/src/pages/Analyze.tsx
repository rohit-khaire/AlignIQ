import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ComplianceShield3D } from '../components/3d/ComplianceShield3D';
import { UploadCard } from '../components/analyze/UploadCard';
import { FilePreview } from '../components/analyze/FilePreview';
import { ProgressTracker } from '../components/analyze/ProgressTracker';
import { ReportDashboard } from '../components/analyze/ReportDashboard';
import { AutoFixer } from '../components/analyze/AutoFixer';
import { FeatureGrid } from '../components/layout/FeatureGrid';
import { API_URL } from '../config';
import { useAuth } from '@clerk/clerk-react';

type AnalyzeState = 'idle' | 'preview' | 'processing' | 'results' | 'autofix';

export const Analyze: React.FC = () => {
  const { userId, sessionId } = useAuth();
  const [appState, setAppState] = useState<AnalyzeState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [consultingInsights, setConsultingInsights] = useState<any>(null);
  const [extractionMetadata, setExtractionMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoFixPerformed, setAutoFixPerformed] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const resetServerSession = () => {
    fetch(`${API_URL}/api/v1/compliance/reset`, {
      method: 'POST',
      headers: { 'X-User-ID': userId || 'anonymous' },
    }).catch(() => {});
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAppState('preview');
  };

  const handleClearFile = () => {
    resetServerSession();
    setSelectedFile(null);
    setReportData([]);
    setConsultingInsights(null);
    setExtractionMetadata(null);
    setAutoFixPerformed(false);
    setError(null);
    setAppState('idle');
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setAppState('preview');
    fetch(`${API_URL}/api/v1/compliance/cancel`, {
      method: 'POST',
      headers: { 'X-User-ID': userId || 'anonymous' },
    }).catch(() => {});
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    cancelledRef.current = false;
    setAppState('processing');
    setError(null);
    setAutoFixPerformed(false);

    const formData = new FormData();
    formData.append('file', selectedFile);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/api/v1/compliance/analyze`, {
        method: 'POST',
        headers: {
          'X-User-ID': userId || 'anonymous',
          'X-Session-ID': sessionId || 'default_session',
        },
        body: formData,
        signal: controller.signal,
      });

      if (cancelledRef.current) return;

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || `Analysis failed (${response.status})`);
      }
      if (data.status === 'cancelled' || cancelledRef.current) return;

      setReportData(data.report);
      setConsultingInsights(data.consulting_insights || null);
      setExtractionMetadata(data.extraction_metadata || null);
      setAppState('results');
    } catch (err: any) {
      if (err.name === 'AbortError' || cancelledRef.current) return;
      setError(err.message || 'An error occurred during analysis.');
      setAppState('preview');
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col pt-20">
      {(appState === 'idle' || appState === 'preview') && <ComplianceShield3D />}

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center justify-center min-h-[60vh]">
        <AnimatePresence mode="wait">
          {(appState === 'idle' || appState === 'preview') && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center mb-16"
            >
              <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground via-primary/80 to-primary dark:from-white dark:via-cyan-100 dark:to-cyan-400 tracking-tight mb-6 dark:drop-shadow-[0_0_30px_rgba(6,182,212,0.3)] drop-shadow-[0_4px_20px_rgba(21,91,208,0.15)]">
                AlignIQ Compliance Analyzer
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Upload policy PDFs for automated extraction, gap analysis, and multi-agent loophole detection — replacing weeks of manual consulting work.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full flex justify-center items-center">
          <AnimatePresence mode="wait">
            {appState === 'idle' && <UploadCard key="upload" onFileSelect={handleFileSelect} />}

            {appState === 'preview' && selectedFile && (
              <div className="w-full flex flex-col items-center">
                <FilePreview
                  key="preview"
                  file={selectedFile}
                  onClear={handleClearFile}
                  onAnalyze={handleAnalyze}
                />
                {error && (
                  <div className="mt-6 text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-6 py-4 rounded-[21px] max-w-2xl w-full text-center">
                    <p className="font-semibold">Analysis Failed</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                )}
              </div>
            )}

            {appState === 'processing' && (
              <ProgressTracker key="processing" onCancel={handleCancel} userId={userId} />
            )}

            {appState === 'results' && (
              <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                <ReportDashboard
                  report={reportData}
                  consultingInsights={consultingInsights}
                  extractionMetadata={extractionMetadata}
                  onReset={handleClearFile}
                  onAutoFix={() => setAppState('autofix')}
                  autoFixPerformed={autoFixPerformed}
                />
              </motion.div>
            )}

            {appState === 'autofix' && (
              <motion.div key="autofix" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                <AutoFixer
                  onBack={() => setAppState('results')}
                  onSuccess={() => setAutoFixPerformed(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {appState === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeatureGrid />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
