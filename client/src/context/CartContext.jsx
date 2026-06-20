import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]); // { itemId, name, description, imagePath, quantity, available }

  function setQuantity(item, quantity) {
    setLines((prev) => {
      const clamped = Math.max(0, Math.min(quantity, item.available));
      const existing = prev.find((l) => l.itemId === item.id);
      if (clamped === 0) {
        return prev.filter((l) => l.itemId !== item.id);
      }
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.id ? { ...l, quantity: clamped } : l
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          description: item.description,
          imagePath: item.image_path,
          available: item.available,
          quantity: clamped,
        },
      ];
    });
  }

  function getQuantity(itemId) {
    return lines.find((l) => l.itemId === itemId)?.quantity || 0;
  }

  function clearCart() {
    setLines([]);
  }

  const totalCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines]
  );

  const value = { lines, setQuantity, getQuantity, clearCart, totalCount };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart muss innerhalb von CartProvider verwendet werden.");
  return ctx;
}
