import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Analyze } from './pages/Analyze';

import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';

const App: React.FC = () => {
  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen bg-[#09090b] items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <img src="/AlignIQ-Logo.png" alt="AlignIQ" className="h-16 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white">Welcome to AlignIQ</h1>
              <p className="text-zinc-400 mt-2">Enterprise Compliance Management</p>
            </div>
            <SignIn 
              routing="virtual" 
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl w-full"
                }
              }}
            />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex h-screen bg-[#09090b] text-[#fafafa] overflow-hidden font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col ml-64 relative overflow-y-auto">
            <Header />
            <main className="flex-1 relative">
              <Analyze />
            </main>
          </div>
        </div>
      </SignedIn>
    </>
  );
};

export default App;
