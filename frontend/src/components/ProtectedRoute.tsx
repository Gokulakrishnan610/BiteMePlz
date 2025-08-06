import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/images/rec college.png" 
              alt="REC College Logo" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-gray-500 mt-4 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check role if required
  if (requiredRole) {
    // Admin can access all routes
    if (user.role === 'admin') {
      return <>{children}</>;
    }

    // Check specific roles
    if (user.role !== requiredRole) {
      // Redirect based on role
      switch (user.role) {
        case 'admin':
          return <Navigate to="/admin" />;
        case 'shopAdmin':
          return <Navigate to="/shop-admin" />;
        default:
          return <Navigate to="/" />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;