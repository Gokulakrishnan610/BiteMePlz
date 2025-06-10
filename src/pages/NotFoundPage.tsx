import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-[var(--primary)]">404</h1>
        <h2 className="text-2xl font-semibold text-[var(--gray-800)] mt-4">
          Page Not Found
        </h2>
        <p className="text-[var(--gray-600)] mt-2 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="btn-primary inline-flex items-center"
        >
          <Home size={20} className="mr-2" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;