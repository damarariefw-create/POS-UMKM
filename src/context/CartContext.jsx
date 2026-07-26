import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext({});

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [heldOrders, setHeldOrders] = useState([]);

  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          subtotal: newQty * Number(product.price),
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            product,
            quantity: 1,
            subtotal: Number(product.price),
          },
        ];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCartItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * Number(item.product.price),
            };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const holdOrder = () => {
    if (cartItems.length === 0) return false;
    setHeldOrders((prev) => [...prev, { id: Date.now(), items: [...cartItems], timestamp: new Date() }]);
    clearCart();
    return true;
  };

  const restoreOrder = (heldOrder) => {
    setCartItems(heldOrder.items);
    setHeldOrders((prev) => prev.filter((o) => o.id !== heldOrder.id));
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const tax = 0;
  const total = subtotal + tax;
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        holdOrder,
        heldOrders,
        restoreOrder,
        subtotal,
        tax,
        total,
        totalItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
