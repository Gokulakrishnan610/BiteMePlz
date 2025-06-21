import React from 'react';

const Loader: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = '' }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="flex space-x-2 text-4xl font-bold text-purple-600">
      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>R</span>
      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>E</span>
      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>C</span>
    </div>
  </div>
);

export default Loader;