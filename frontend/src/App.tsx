import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { ToastProvider } from './components/ToastContainer';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ShopAdminLayout from './layouts/ShopAdminLayout';

// Public Pages
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NotFoundPage from './pages/NotFoundPage';

// Student Pages
import CartPage from './pages/student/CartPage';
import OrdersPage from './pages/student/OrdersPage';
import OrderDetailsPage from './pages/student/OrderDetailsPage';
import ProfilePage from './pages/student/ProfilePage';

// Admin Pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminShopsPage from './pages/admin/ShopsPage';
import AdminShopDetailsPage from './pages/admin/ShopDetailsPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminCreateShopPage from './pages/admin/CreateShopPage';
import AdminEditShopPage from './pages/admin/EditShopPage';
import TransactionsPage from './pages/admin/TransactionsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import FinancialReportsPage from './pages/admin/FinancialReportsPage';
import ShopLogsPage from './pages/shopAdmin/ShopLogsPage';
import StudentAnalyticsPage from './pages/shopAdmin/StudentAnalyticsPage';
import MaintenancePage from './pages/admin/MaintenancePage';

// shop Admin Pages
import ShopAdminDashboardPage from './pages/shopAdmin/DashboardPage';
import ShopAdminProductsPage from './pages/shopAdmin/ProductsPage';
import ShopAdminCreateProductPage from './pages/shopAdmin/CreateProductPage';
import ShopAdminEditProductPage from './pages/shopAdmin/EditProductPage';
import ShopAdminOrdersPage from './pages/shopAdmin/OrdersPage';
import ShopAdminTransactionsPage from './pages/shopAdmin/TransactionsPage';
import ShopAdminScanQRPage from './pages/shopAdmin/ScanQRPage';
import SubShopAdminsPage from './pages/shopAdmin/SubShopAdminsPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import LocalhostNotification from './components/LocalhostNotification';

function App() {
  const { loading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);

  // Persist maintenance mode in localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('maintenanceMode');
    if (stored) setMaintenanceMode(stored === 'true');
  }, []);

  // Update localStorage when maintenance mode changes
  React.useEffect(() => {
    localStorage.setItem('maintenanceMode', maintenanceMode.toString());
  }, [maintenanceMode]);

  if (maintenanceMode) {
    return <MaintenancePage />;
  }

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

  return (
    <ToastProvider>
      <WalletProvider>
        <LocalhostNotification />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="shop/:id" element={<ShopPage />} />
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            
            {/* Student Routes */}
            <Route path="cart" element={<CartPage />} />
            <Route 
              path="profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="orders" 
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="order/:id" 
              element={
                <ProtectedRoute>
                  <OrderDetailsPage />
                </ProtectedRoute>
              } 
            />
          </Route>
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route 
              index 
              element={<AdminDashboardPage setMaintenanceMode={setMaintenanceMode} />} 
            />
            <Route path="shops" element={<AdminShopsPage />} />
            <Route path="shops/:id" element={<AdminShopDetailsPage />} />
            <Route path="shops/:id/edit" element={<AdminEditShopPage />} />
            <Route path="shops/create" element={<AdminCreateShopPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="financial-reports" element={<FinancialReportsPage />} />
                        
            <Route path="shop-logs" element={<ShopLogsPage />} />
            <Route path="student-analytics" element={<StudentAnalyticsPage />} />
          </Route>
          
          {/* shop Admin Routes */}
          <Route 
            path="/shop-admin" 
            element={
              <ProtectedRoute requiredRole="shopAdmin">
                <ShopAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ShopAdminDashboardPage />} />
            <Route path="products" element={<ShopAdminProductsPage />} />
            <Route path="products/create" element={<ShopAdminCreateProductPage />} />
            <Route path="products/edit/:id" element={<ShopAdminEditProductPage />} />
            <Route path="orders" element={<ShopAdminOrdersPage />} />
            <Route path="transactions" element={<ShopAdminTransactionsPage />} />
            <Route path="scan" element={<ShopAdminScanQRPage />} />
            <Route path="sub-admins" element={<SubShopAdminsPage />} />
          </Route>
          
          {/* 404 Page - Must be last */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </WalletProvider>
    </ToastProvider>
  );
}

export default App;