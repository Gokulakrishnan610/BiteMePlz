import React from 'react';

const Loader: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = '' }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div
      className="animate-spin rounded-full border-t-2 border-b-2 border-purple-600"
      style={{ width: size, height: size }}
    ></div>
  </div>
);

export default Loader; 