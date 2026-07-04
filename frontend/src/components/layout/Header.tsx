import React from 'react';
import { Moon, Bell } from 'lucide-react';
import { FiGithub } from 'react-icons/fi';

export const Header: React.FC = () => {
  return (
    <header className="h-20 w-full flex items-center justify-end px-10 relative z-30">
      <div className="flex items-center space-x-6">
        <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
          About
        </a>
        <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
          Documentation
        </a>
        
        <div className="h-6 w-px bg-white/10 mx-2"></div>
        
        <button className="text-zinc-400 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
        </button>
        
        <button className="text-zinc-400 hover:text-white transition-colors">
          <Moon className="w-5 h-5" />
        </button>
        
        <a href="https://github.com/rohit-khaire" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors flex items-center">
          <FiGithub className="w-5 h-5" />
        </a>
        
        <div className="ml-4 w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=transparent" alt="User" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
};
