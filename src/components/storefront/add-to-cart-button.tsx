"use client";

import { useCart } from "@/features/cart/cart-provider";

export function AddToCartButton({
  service,
  label,
}: {
  service: {
    id: string;
    slug: string;
    name: string;
    price: string;
    currency: string;
  };
  label: string;
}) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      onClick={() =>
        addItem({
          id: service.id,
          slug: service.slug,
          name: service.name,
          price: service.price,
          currency: service.currency,
        })
      }
      className="mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#157037] px-3 text-sm font-semibold text-white hover:bg-[#116332]"
    >
      {label}
    </button>
  );
}
