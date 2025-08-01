import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Zap } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="p-4 rounded-full bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] glow">
            <Zap size={32} className="text-white" />
          </div>
        </div>

        {/* 404 */}
        <h1 className="text-9xl font-bold gradient-text mb-4">404</h1>
        
        {/* Message */}
        <div className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-[var(--primary-text)] mb-4">
            Page Not Found
          </h2>
          <p className="text-[var(--secondary-text)] mb-6">
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back to shopping!
          </p>
          
          <Link
            to="/"
            className="btn-primary inline-flex items-center text-lg px-8 py-3"
          >
            <Home size={20} className="mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Additional Links */}
        <div className="space-y-2">
          <Link
            to="/login"
            className="text-[var(--accent-purple)] hover:text-[var(--accent-violet)] transition-colors block"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors block"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;