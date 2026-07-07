import React from 'react';
import { LayoutDashboard, FileSearch, History, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
  activePage: 'analyze' | 'history';
  setActivePage: (page: 'analyze' | 'history') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { theme } = useTheme();

  return (
    <div className="w-64 h-screen fixed left-0 top-0 glass-panel border-r border-border flex flex-col pt-6 z-40">
      <div className="flex items-center px-6 mb-12 gap-3">
        <img src="/AlignIQ-Logo.png" alt="AlignIQ Logo" className="w-9 h-9 object-contain dark:invert-0 invert" />
        <span className="text-2xl font-black tracking-tight text-foreground">AlignIQ</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <a href="#" className="flex items-center px-4 py-3 text-muted-foreground hover:text-foreground rounded-[21px] transition-colors opacity-50 cursor-not-allowed">
          <LayoutDashboard className="w-5 h-5 mr-3" />
          <span className="font-medium text-[16px]">Dashboard</span>
        </a>

        <div className="relative">
          {activePage === 'analyze' && (
            <motion.div
              layoutId="activeTab"
              className={`absolute inset-0 rounded-[21px] border ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border-cyan-500/20' 
                  : 'bg-primary/10 border-primary/20'
              }`}
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <button 
            onClick={() => setActivePage('analyze')}
            className={`relative flex w-full items-center px-4 py-3 rounded-[21px] transition-colors ${activePage === 'analyze' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FileSearch className="w-5 h-5 mr-3" />
            <span className="font-medium text-[16px]">Analyze</span>
          </button>
        </div>

        <div className="relative">
          {activePage === 'history' && (
            <motion.div
              layoutId="activeTab"
              className={`absolute inset-0 rounded-[21px] border ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border-cyan-500/20' 
                  : 'bg-primary/10 border-primary/20'
              }`}
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <button 
            onClick={() => setActivePage('history')}
            className={`relative flex w-full items-center px-4 py-3 rounded-[21px] transition-colors ${activePage === 'history' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <History className="w-5 h-5 mr-3" />
            <span className="font-medium text-[16px]">History</span>
          </button>
        </div>

        <a href="#" className="flex items-center px-4 py-3 text-muted-foreground hover:text-foreground rounded-[21px] transition-colors opacity-50 cursor-not-allowed">
          <Settings className="w-5 h-5 mr-3" />
          <span className="font-medium text-[16px]">Settings</span>
        </a>
      </nav>

    </div>
  );
};
