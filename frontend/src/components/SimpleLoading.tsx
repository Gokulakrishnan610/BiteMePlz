import React from 'react';

const SimpleLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
        
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

export default SimpleLoading; 