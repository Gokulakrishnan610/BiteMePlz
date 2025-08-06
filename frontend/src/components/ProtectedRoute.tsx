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
    return null;
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