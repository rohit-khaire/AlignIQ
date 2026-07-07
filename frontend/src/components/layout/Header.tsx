import React, { useState } from 'react';
import { Moon, Sun, Bell, LogOut, Loader2 } from 'lucide-react';
import { FiGithub } from 'react-icons/fi';
import { useAuth, useUser } from '@clerk/clerk-react';
import { API_URL } from '../../config';
import { useTheme } from '../../contexts/ThemeContext';

export const Header: React.FC = () => {
  const { signOut, userId } = useAuth();
  const { user } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch(`${API_URL}/api/v1/compliance/reset`, { 
        method: 'POST',
        headers: { 'X-User-ID': userId || 'anonymous' }
      });
    } catch (e) {
      console.error("Failed to reset session on logout", e);
    }
    await signOut();
  };

  return (
    <header className="h-[43px] mt-4 w-full flex items-center justify-end px-10 relative z-30">
      <div className="flex items-center space-x-6">
        <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          About
        </a>
        <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Documentation
        </a>

        <div className="h-6 w-px bg-border mx-2"></div>

        <button className="text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_var(--color-primary)]"></span>
        </button>

        <button 
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <a href="https://github.com/rohit-khaire" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center">
          <FiGithub className="w-5 h-5" />
        </a>

        <div className="ml-4 flex items-center gap-4 bg-muted/50 border border-border rounded-[21px] pl-2 pr-4 py-1.5">
          {user && (
            <>
              <img 
                src={user.imageUrl} 
                alt={user.fullName || "User"} 
                className="w-8 h-8 rounded-full border border-border"
              />
              <span className="text-[14px] font-medium text-foreground">
                Hello, {user.firstName || 'User'}
              </span>
            </>
          )}
          <div className="h-4 w-px bg-border mx-1"></div>
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-1.5 text-[14px] font-medium disabled:opacity-50"
            title="Logout and Clean Data"
          >
            {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
