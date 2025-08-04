import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} className="text-green-400" />;
      case 'error':
        return <XCircle size={24} className="text-red-400" />;
      case 'warning':
        return <AlertCircle size={24} className="text-yellow-400" />;
      case 'info':
        return <Info size={24} className="text-blue-400" />;
      default:
        return <Info size={24} className="text-blue-400" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "border-l-4 backdrop-blur-md";
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-500/10 border-green-500 shadow-green-500/20`;
      case 'error':
        return `${baseStyles} bg-red-500/10 border-red-500 shadow-red-500/20`;
      case 'warning':
        return `${baseStyles} bg-yellow-500/10 border-yellow-500 shadow-yellow-500/20`;
      case 'info':
        return `${baseStyles} bg-blue-500/10 border-blue-500 shadow-blue-500/20`;
      default:
        return `${baseStyles} bg-gray-500/10 border-gray-500 shadow-gray-500/20`;
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div className={`
        ${getStyles()}
        rounded-lg shadow-2xl p-4 border border-white/10
        hover:shadow-3xl transition-shadow duration-200
      `}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white mb-1">
              {title}
            </h4>
            {message && (
              <p className="text-sm text-gray-300 leading-relaxed">
                {message}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Progress bar */}
        {duration > 0 && (
          <div className="mt-3 w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ease-linear ${
                type === 'success' ? 'bg-green-400' :
                type === 'error' ? 'bg-red-400' :
                type === 'warning' ? 'bg-yellow-400' :
                'bg-blue-400'
              }`}
              style={{
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default Toast;