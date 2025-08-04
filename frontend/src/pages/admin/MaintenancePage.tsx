import React from 'react';
import { Wrench, RefreshCw } from 'lucide-react';

const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--main-bg)] p-4">
      <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-8 flex flex-col items-center max-w-md w-full border border-[var(--border-color)]">
        <Wrench size={64} className="text-[var(--accent-purple)] mb-4 animate-bounce" />
        <h1 className="text-3xl font-bold mb-2 text-[var(--primary-text)]">We'll Be Back Soon!</h1>
        <p className="text-lg text-[var(--secondary-text)] mb-6 text-center">
          Our system is currently undergoing scheduled maintenance.<br />
          We appreciate your patience and will be back online shortly.
        </p>
        <div className="flex items-center gap-2 text-[var(--muted-text)] mb-2">
          <RefreshCw className="animate-spin" size={20} />
          <span>Refreshing automatically...</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary mt-4 px-6 py-2 rounded font-semibold"
        >
          Refresh Now
        </button>
      </div>
      <footer className="mt-8 text-[var(--muted-text)] text-sm">
        &copy; {new Date().getFullYear()} REC KIOSK. All rights reserved.
      </footer>
    </div>
  );
};

export default MaintenancePage;
