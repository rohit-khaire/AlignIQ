import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Analyze } from './pages/Analyze';
import { History } from './pages/History';
import { API_URL } from './config';
import { ThemeProvider } from './contexts/ThemeContext';

import { SignedIn, SignedOut, SignIn, useAuth } from '@clerk/clerk-react';

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<'analyze' | 'history'>('analyze');
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && userId) {
      fetch(`${API_URL}/api/v1/users/login`, {
        method: 'POST',
        headers: { 'X-User-ID': userId }
      }).catch(err => console.error('Failed to log login timestamp', err));
    }
  }, [isLoaded, userId]);

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex-1 flex flex-col ml-64 relative overflow-y-auto">
        <Header />
        <main className="flex-1 relative">
          {activePage === 'analyze' ? <Analyze /> : <History />}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="aligniq-ui-theme">
      <SignedOut>
        <div className="flex min-h-screen bg-background items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <img src="/AlignIQ-Logo.png" alt="AlignIQ" className="h-16 mx-auto mb-4 dark:invert-0 invert" />
              <h1 className="text-2xl font-bold text-foreground">Welcome to AlignIQ</h1>
              <p className="text-muted-foreground mt-2">AlignIQ Compliance Management</p>
            </div>
            <SignIn 
              routing="virtual" 
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "bg-card border border-border shadow-2xl rounded-[21px] w-full"
                }
              }}
            />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <AppContent />
      </SignedIn>
    </ThemeProvider>
  );
};

export default App;
