"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const storageKey = "mafateeh.cart";

export type CartLine = {
  id: string;
  slug: string;
  name: string;
  price: string;
  currency: string;
  quantity: number;
};

type CartInput = Omit<CartLine, "quantity">;

type CartContextValue = {
  items: CartLine[];
  count: number;
  open: boolean;
  addItem: (item: CartInput) => void;
  removeItem: (id: string) => void;
  toggle: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") {
    return false;
  }

  const line = value as CartLine;
  return (
    typeof line.id === "string" &&
    typeof line.slug === "string" &&
    typeof line.name === "string" &&
    typeof line.price === "string" &&
    typeof line.currency === "string" &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  );
}

function readCart(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartLine[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    return;
  }
}

function withItem(items: CartLine[], item: CartInput) {
  const existing = items.find((line) => line.id === item.id);

  if (!existing) {
    return [...items, { ...item, quantity: 1 }];
  }

  return items.map((line) =>
    line.id === item.id ? { ...line, ...item, quantity: line.quantity + 1 } : line,
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) {
      return;
    }

    hydrated.current = true;
    setItems(readCart());
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((total, line) => total + line.quantity, 0),
      open,
      addItem(item) {
        setItems((current) => {
          const base = hydrated.current ? current : readCart();
          hydrated.current = true;
          const next = withItem(base, item);
          writeCart(next);
          return next;
        });
        setOpen(true);
      },
      removeItem(id) {
        setItems((current) => {
          const base = hydrated.current ? current : readCart();
          hydrated.current = true;
          const next = base.filter((line) => line.id !== id);
          writeCart(next);
          return next;
        });
      },
      toggle() {
        setOpen((current) => !current);
      },
      close() {
        setOpen(false);
      },
    }),
    [items, open],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);

  if (!cart) {
    throw new Error("useCart must be used within CartProvider.");
  }

  return cart;
}
