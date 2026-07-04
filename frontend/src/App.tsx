import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Analyze } from './pages/Analyze';

const App: React.FC = () => {
  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 relative overflow-y-auto">
        <Header />
        <main className="flex-1 relative">
          <Analyze />
        </main>
      </div>
    </div>
  );
};

export default App;
