import React from 'react';

const Loader: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = '' }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="flex space-x-2 text-4xl font-bold">
      <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '0ms' }}>L</span>
      <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '150ms' }}>O</span>
      <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '300ms' }}>A</span>
      <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '450ms' }}>D</span>
      <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '600ms' }}>I</span>
      <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '750ms' }}>N</span>
      <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '900ms' }}>G</span>
    </div>
  </div>
);

export default Loader;