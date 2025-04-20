import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);

  // Add item to cart
  const addToCart = (item, shopData) => {
    // If trying to add items from a different shop, clear the cart first
    if (shopInfo && shopInfo.id !== shopData.id) {
      setCart([]);
      setShopInfo(shopData);
    }
    
    // If no shop info is set yet, set it
    if (!shopInfo) {
      setShopInfo(shopData);
    }
    
    // Check if item already in cart
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex !== -1) {
      // Item exists, update quantity
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      // Item does not exist, add it
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Increment item quantity
  const incrementItem = (itemId) => {
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === itemId);
    
    if (existingItemIndex !== -1) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    }
  };

  // Decrement item quantity
  const decrementItem = (itemId) => {
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === itemId);
    
    if (existingItemIndex !== -1) {
      const newCart = [...cart];
      if (newCart[existingItemIndex].quantity > 1) {
        // Reduce quantity
        newCart[existingItemIndex].quantity -= 1;
        setCart(newCart);
      } else {
        // Remove item from cart if quantity will be 0
        removeItem(itemId);
      }
    }
  };

  // Remove specific item completely
  const removeItem = (itemId) => {
    const newCart = cart.filter(item => item.id !== itemId);
    setCart(newCart);
    
    // If cart is empty, reset shop info
    if (newCart.length === 0) {
      setShopInfo(null);
    }
  };

  // Remove item from cart (decrease quantity or remove)
  const removeFromCart = (itemId) => {
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === itemId);
    
    if (existingItemIndex !== -1) {
      const newCart = [...cart];
      if (newCart[existingItemIndex].quantity > 1) {
        // Reduce quantity
        newCart[existingItemIndex].quantity -= 1;
      } else {
        // Remove item from cart
        newCart.splice(existingItemIndex, 1);
      }
      
      setCart(newCart);
      
      // If cart is empty, reset shop info
      if (newCart.length === 0) {
        setShopInfo(null);
      }
    }
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setShopInfo(null);
  };

  // Get total price
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 1)), 0);
  };

  // Get cart item count
  const getItemCount = () => {
    return cart.reduce((total, item) => total + (item.quantity || 1), 0);
  };

  // Calculate total amount
  const totalAmount = getTotalPrice();

  const value = {
    cart,
    shopData: shopInfo,
    totalAmount,
    addToCart,
    removeFromCart,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
    getTotalPrice,
    getItemCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 