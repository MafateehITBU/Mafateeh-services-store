"use client";

import { createContext, useContext, useEffect, useState } from "react";

type WishlistValue = {
  saved: (serviceId: string) => boolean;
  toggle: (serviceId: string) => Promise<boolean>;
};

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/wishlist")
      .then((response) => response.json())
      .then((body: { ids?: string[] }) => {
        if (!cancelled && Array.isArray(body.ids)) {
          setIds(body.ids);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(serviceId: string) {
    const response = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId }),
    });

    if (response.status === 401) {
      window.dispatchEvent(new Event("mafateeh-open-signin"));
      return false;
    }

    const body = (await response.json().catch(() => null)) as { saved?: boolean } | null;

    if (!response.ok || typeof body?.saved !== "boolean") {
      return false;
    }

    setIds((current) => (body.saved ? [...new Set([...current, serviceId])] : current.filter((id) => id !== serviceId)));
    return true;
  }

  return <WishlistContext.Provider value={{ saved: (serviceId) => ids.includes(serviceId), toggle }}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext) ?? { saved: () => false, toggle: async () => false };
}
