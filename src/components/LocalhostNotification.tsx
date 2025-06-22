import React, { useEffect, useState } from 'react';
import { Zap, Globe, Code, Server } from 'lucide-react';

const LocalhostNotification: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if running on localhost
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');

    // Check if user has dismissed this notification
    const dismissed = localStorage.getItem('localhost-notification-dismissed');

    if (isLocalhost && !dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('localhost-notification-dismissed', 'true');
  };

  const handleDismissForSession = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (isDismissed || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-md border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
        {/* Animated header bar */}
        <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse" />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Development Mode</h3>
              <p className="text-purple-300 text-sm">Campus Kiosk</p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3 mb-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              You're running Campus Kiosk in development mode on localhost. 
              This environment includes debugging tools and enhanced logging.
            </p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <Server size={12} />
                <span>Local Server</span>
              </div>
              <div className="flex items-center space-x-1">
                <Code size={12} />
                <span>Dev Tools</span>
              </div>
              <div className="flex items-center space-x-1">
                <Globe size={12} />
                <span>Hot Reload</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleDismissForSession}
              className="flex-1 px-3 py-2 text-xs bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors duration-200"
            >
              Hide for Session
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 px-3 py-2 text-xs bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
            >
              Don't Show Again
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
        <div className="absolute bottom-4 right-6 w-1 h-1 bg-pink-400 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

export default LocalhostNotification;