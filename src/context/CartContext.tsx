import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  product: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  stock: number;
}

interface CartContextType {
  cartItems: CartItem[];
  shopId: string | null;
  addToCart: (item: CartItem, shopId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);

  // Initialize cart from localStorage
  useEffect(() => {
    const storedCart = localStorage.getItem('cartItems');
    const storedShopId = localStorage.getItem('shopId');
    
    if (storedCart) {
      setCartItems(JSON.parse(storedCart));
    }
    
    if (storedShopId) {
      setShopId(storedShopId);
    }
  }, []);

  // Update localStorage when cart changes
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    if (shopId) {
      localStorage.setItem('shopId', shopId);
    } else {
      localStorage.removeItem('shopId');
    }
  }, [cartItems, shopId]);

  const addToCart = (item: CartItem, newShopId: string) => {
    // If adding from a different shop, clear the cart first
    if (shopId && shopId !== newShopId) {
      if (!window.confirm('Adding items from a different shop will clear your current cart. Continue?')) {
        return;
      }
      setCartItems([]);
    }
    
    setShopId(newShopId);
    
    // Check if item already exists in cart
    const existingItem = cartItems.find(i => i.product === item.product);
    
    if (existingItem) {
      // Update quantity if it exists
      setCartItems(
        cartItems.map(i =>
          i.product === item.product
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
            : i
        )
      );
    } else {
      // Add new item
      setCartItems([...cartItems, item]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.product !== productId));
    
    // If cart is empty, reset shopId
    if (cartItems.length === 1) {
      setShopId(null);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCartItems(
      cartItems.map(item =>
        item.product === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setShopId(null);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const value = {
    cartItems,
    shopId,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};