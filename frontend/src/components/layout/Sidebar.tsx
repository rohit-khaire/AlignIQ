import React, { useState } from 'react';
import { LayoutDashboard, FileSearch, History, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../../config';

export const Sidebar: React.FC = () => {
  const [resetting, setResetting] = useState(false);

  const handleSecretReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/compliance/reset`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Successfully deleted temporary files and cleared Pinecone VectorDB.");
      } else {
        alert("Failed to reset: " + data.detail);
      }
    } catch (e) {
      alert("Error triggering secret reset: " + e);
    }
    setResetting(false);
  };

  return (
    <div className="w-64 h-screen fixed left-0 top-0 glass-panel border-r border-white/5 flex flex-col pt-6 z-40">
      <div className="flex items-center px-6 mb-12 gap-3">
        <img src="/AlignIQ-Logo.png" alt="AlignIQ Logo" className="w-9 h-9 object-contain" />
        <span className="text-2xl font-black tracking-tight text-white">AlignIQ</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <a href="#" className="flex items-center px-4 py-3 text-zinc-400 hover:text-white rounded-xl transition-colors opacity-50 cursor-not-allowed">
          <LayoutDashboard className="w-5 h-5 mr-3" />
          <span className="font-medium">Dashboard</span>
        </a>

        <div className="relative">
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/5 rounded-xl border border-cyan-500/20"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <a href="#" className="relative flex items-center px-4 py-3 text-cyan-400 rounded-xl">
            <FileSearch className="w-5 h-5 mr-3" />
            <span className="font-medium">Analyze</span>
          </a>
        </div>

        <a href="#" className="flex items-center px-4 py-3 text-zinc-400 hover:text-white rounded-xl transition-colors opacity-50 cursor-not-allowed">
          <History className="w-5 h-5 mr-3" />
          <span className="font-medium">History</span>
        </a>

        <a href="#" className="flex items-center px-4 py-3 text-zinc-400 hover:text-white rounded-xl transition-colors opacity-50 cursor-not-allowed">
          <Settings className="w-5 h-5 mr-3" />
          <span className="font-medium">Settings</span>
        </a>
      </nav>

      <div className="p-6">
        <div className="glass-card p-4 rounded-xl border border-white/5 text-sm text-zinc-400">
          <div 
            className="font-semibold text-white mb-1 cursor-pointer hover:text-cyan-400 transition-colors"
            onClick={handleSecretReset}
            title="Secret Reset"
          >
            {resetting ? "Resetting..." : "Enterprise Plan"}
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 mb-2 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 w-[45%] h-full"></div>
          </div>
          <div className="flex justify-between text-xs">
            <span>45 / 100 docs</span>
            <span className="text-cyan-400">Upgrade</span>
          </div>
        </div>
      </div>
    </div>
  );
};
