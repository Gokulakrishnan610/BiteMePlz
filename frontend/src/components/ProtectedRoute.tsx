import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'shopAdmin' | 'student';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
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