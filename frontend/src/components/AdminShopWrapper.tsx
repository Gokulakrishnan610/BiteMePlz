import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminShop } from '../context/AdminShopContext';

interface AdminShopWrapperProps {
  children: ReactNode;
  shopId?: string;
}

const AdminShopWrapper: React.FC<AdminShopWrapperProps> = ({ children, shopId }) => {
  const { user } = useAuth();
  const { selectedShop } = useAdminShop();

  // If user is admin and has selected a shop, use that shop's ID
  // Otherwise, use the user's own shop ID
  const effectiveShopId = user?.role === 'admin' && selectedShop ? selectedShop.id : (shopId || user?.shop);

  // Create a modified user object with the effective shop ID
  const modifiedUser = user ? { ...user, shop: effectiveShopId } : user;

  // Clone children and pass the modified user context
  const childrenWithModifiedContext = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { user: modifiedUser } as any);
    }
    return child;
  });

  return <>{childrenWithModifiedContext}</>;
};

export default AdminShopWrapper;
