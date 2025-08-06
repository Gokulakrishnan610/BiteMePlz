import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '../components/ToastContainer';

export interface CartItem {
  product_id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  stock: number;
  shop_id: string;
  shop_name: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, shop_id: string) => void;
  updateQuantity: (productId: string, shop_id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getItemsByShop: () => { [shop_id: string]: { items: CartItem[], shop_name: string } };
  getShopIds: () => string[];
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
  const { showSuccess } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Initialize cart from localStorage
  useEffect(() => {
    const storedCart = localStorage.getItem('cartItems');
    
    if (storedCart) {
      setCartItems(JSON.parse(storedCart));
    }
  }, []);

  // Update localStorage when cart changes
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: CartItem) => {
    // Check if item already exists in cart (same product from same shop)
    const existingItem = cartItems.find(i => 
      i.product === item.product && i.shop_id === item.shop_id
    );
    
    if (existingItem) {
      // Update quantity if it exists
      setCartItems(
        cartItems.map(i =>
          i.product === item.product && i.shop_id === item.shop_id
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
            : i
        )
      );
      showSuccess('Cart Updated', `Updated quantity for ${item.name} in cart.`);
    } else {
      // Add new item
      setCartItems([...cartItems, item]);
    showSuccess('Added to Cart', `${item.name} has been added to your cart.`);
    }
  };

  const removeFromCart = (productId: string, shop_id: string) => {
    setCartItems(cartItems.filter(item => 
      !(item.product === productId && item.shop_id === shop_id)
    ));
  };

  const updateQuantity = (productId: string, shop_id: string, quantity: number) => {
    setCartItems(
      cartItems.map(item =>
        item.product === productId && item.shop_id === shop_id
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getItemsByShop = () => {
    const itemsByShop: { [shop_id: string]: { items: CartItem[], shop_name: string } } = {};
    
    cartItems.forEach(item => {
      if (!itemsByShop[item.shop_id]) {
        itemsByShop[item.shop_id] = { items: [], shop_name: item.shop_name };
      }
      itemsByShop[item.shop_id].items.push(item);
    });
    
    return itemsByShop;
  };

  const getShopIds = () => {
    return [...new Set(cartItems.map(item => item.shop_id))];
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems,
      getItemsByShop,
      getShopIds
    }}>
      {children}
    </CartContext.Provider>
  );
};