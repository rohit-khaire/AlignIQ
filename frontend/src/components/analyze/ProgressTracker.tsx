import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';

const steps = [
  "Uploading Document...",
  "Extracting Text...",
  "Splitting Company Policies...",
  "Searching Knowledge Base...",
  "Analyzing Compliance...",
  "Generating Report..."
];

export const ProgressTracker: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  // Realistic progress simulation based on backend latency
  useEffect(() => {
    const stepDelays = [1500, 1500, 2000, 3000, 35000, 2000];
    let timeoutId: ReturnType<typeof setTimeout>;

    const advanceStep = (stepIndex: number) => {
      if (stepIndex >= steps.length - 1) return;
      
      timeoutId = setTimeout(() => {
        setCurrentStep(stepIndex + 1);
        advanceStep(stepIndex + 1);
      }, stepDelays[stepIndex] || 5000);
    };

    advanceStep(0);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="glass-card rounded-2xl p-10 glow-border relative overflow-hidden">
        {/* Animated background glow */}
        <motion.div 
          className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="relative w-24 h-24 mb-6">
            <svg className="w-full h-full text-zinc-800" viewBox="0 0 100 100">
              <circle className="stroke-current" cx="50" cy="50" r="45" fill="none" strokeWidth="4" />
            </svg>
            <motion.svg 
              className="w-full h-full text-cyan-400 absolute inset-0 -rotate-90" 
              viewBox="0 0 100 100"
            >
              <motion.circle 
                className="stroke-current" 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: (currentStep + 1) / steps.length }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </motion.svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {Math.round(((currentStep + 1) / steps.length) * 100)}%
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Processing Policy</h2>
          <p className="text-zinc-400 mt-2">Running AI-powered compliance analysis...</p>
        </div>

        <div className="space-y-6 relative z-10">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step} className="flex items-center gap-4">
                <div className="relative">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                    </motion.div>
                  ) : isActive ? (
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  ) : (
                    <CircleDashed className="w-6 h-6 text-zinc-600" />
                  )}
                  {index < steps.length - 1 && (
                    <div className={`absolute top-6 left-3 w-px h-6 -ml-px ${
                      isCompleted ? 'bg-cyan-400/50' : 'bg-zinc-800'
                    }`} />
                  )}
                </div>
                <span className={`font-medium transition-colors duration-300 ${
                  isActive ? 'text-white' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'
                }`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
