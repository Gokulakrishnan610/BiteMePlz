// Common types used across the application
export interface User {
  _id: string;
  name: string;
  email: string;
  rollNo?: string;
  role: 'admin' | 'shopAdmin' | 'student';
  shop?: string;
  balance?: number;
  isVerified?: boolean;
  is_sub_admin?: boolean;
  parent_admin?: string;
}

export interface shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  image?: string;
  is_active: boolean;
  is_open: boolean;
  final_validity_time: string;
  qrValidityMinutes: number;
  shopAdmin: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: string; // Added missing category field
  price: number;
  stock: number;
  image: string;
  shop: string;
  is_available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  stock?: number;
}

export interface Order {
  _id: string;
  order_id: string;
  user: User | string;
  shop: shop | string;
  order_items: OrderItem[];
  totalPrice: number;
  isPaid: boolean;
  isVerified: boolean;
  status: 'pending' | 'completed' | 'expired';
  qrCode?: string;
  qrValidUntil?: string;
  balanceAmount: number;
  final_validity: string;
  payment_result?: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    status?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  shop: shop | string;
  order: Order | string;
  user: User | string;
  type: 'payment' | 'refund' | 'verification' | 'expiry' | 'cancellation';
  amount: number;
  status: 'success' | 'failed' | 'pending';
  paymentMethod?: 'balance' | 'razorpay';
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem extends OrderItem {
  stock: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}