import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, CircleDashed, Loader2, Clock, Zap, FileSearch } from 'lucide-react';
import { API_URL } from '../../config';

const FALLBACK_STEPS = [
  'Uploading document',
  'Extracting text from PDF',
  'Structuring policies',
  'Indexing in knowledge base',
  'Running compliance gap analysis',
  'Generating consulting deliverable',
];

interface ProgressTrackerProps {
  onCancel: () => void;
  userId?: string | null;
}

interface ProgressState {
  step: string;
  step_index: number;
  percent: number;
  message: string;
  detail: string | null;
  status: string;
  policies_extracted?: number;
  policies_analyzed?: number;
  policies_total?: number;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ onCancel, userId }) => {
  const [progress, setProgress] = useState<ProgressState>({
    step: 'upload',
    step_index: 0,
    percent: 2,
    message: 'Starting analysis…',
    detail: null,
    status: 'running',
  });
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState(FALLBACK_STEPS);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledLocally = useRef(false);

  const handleCancelClick = () => {
    cancelledLocally.current = true;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    onCancel();
  };

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const poll = async () => {
      if (cancelledLocally.current) return;
      try {
        const res = await fetch(`${API_URL}/api/v1/compliance/progress`, {
          headers: { 'X-User-ID': userId || 'anonymous' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.progress?.status === 'cancelled') {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
          }
          if (data.progress) setProgress(data.progress);
          if (data.steps?.length) {
            setSteps(data.steps.map((s: { label: string }) => s.label));
          }
        }
      } catch {
        /* keep last known progress */
      }
    };

    poll();
    pollRef.current = setInterval(poll, 800);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [userId]);

  const progressPercentage = progress.status === 'complete' ? 100 : Math.max(progress.percent, 2);
  const currentStepIndex = progress.step_index ?? 0;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="glass-card rounded-2xl p-10 glow-border relative overflow-hidden">
        <motion.div
          className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="relative w-28 h-28 mb-6">
            <svg className="w-full h-full text-zinc-800" viewBox="0 0 100 100">
              <circle className="stroke-current" cx="50" cy="50" r="45" fill="none" strokeWidth="4" />
            </svg>
            <motion.svg className="w-full h-full text-cyan-400 absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <motion.circle
                className="stroke-current"
                cx="50" cy="50" r="45"
                fill="none" strokeWidth="4" strokeLinecap="round"
                animate={{ pathLength: progressPercentage / 100 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </motion.svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{progressPercentage}%</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-white tracking-tight text-center">
            {progress.status === 'complete' ? 'Analysis Complete' : 'Automating Compliance'}
          </h2>

          <AnimatePresence mode="wait">
            <motion.p
              key={progress.message}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-cyan-300/90 mt-3 text-sm font-medium text-center max-w-md"
            >
              {progress.message}
            </motion.p>
          </AnimatePresence>

          {progress.detail && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-zinc-500 mt-2 text-xs text-center max-w-sm flex items-center justify-center gap-1.5"
            >
              <FileSearch className="w-3.5 h-3.5 shrink-0" />
              {progress.detail}
            </motion.p>
          )}

          <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(elapsed)}
            </span>
            {progress.policies_extracted ? (
              <span className="flex items-center gap-1.5 text-emerald-500/80">
                <Zap className="w-3.5 h-3.5" />
                {progress.policies_extracted} policies extracted
              </span>
            ) : null}
            {progress.policies_total && progress.step === 'analyze' ? (
              <span>
                {progress.policies_analyzed ?? 0}/{progress.policies_total} policies
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          {steps.map((label, index) => {
            const isActive = index === currentStepIndex && progress.status === 'running';
            const isCompleted = index < currentStepIndex || progress.status === 'complete';
            return (
              <motion.div
                key={label}
                initial={false}
                animate={{ opacity: isCompleted || isActive ? 1 : 0.45 }}
                className="flex items-center gap-4"
              >
                <div className="relative shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  ) : (
                    <CircleDashed className="w-5 h-5 text-zinc-600" />
                  )}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-white' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {label}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center relative z-10">
          <button
            onClick={handleCancelClick}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-medium transition-all active:scale-95"
          >
            Cancel Analysis
          </button>
        </div>
      </div>
    </motion.div>
  );
};
