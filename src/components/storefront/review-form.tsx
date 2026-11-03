"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ReviewForm({ serviceId }: { serviceId: string }) {
  const t = useTranslations("Store");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (rating < 1 || pending) {
      return;
    }

    setPending(true);
    setMessage(null);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, rating, comment }),
    });
    setPending(false);

    if (!response.ok) {
      setMessage(t("reviewError"));
      return;
    }

    setSaved(true);
    setMessage(t("reviewSaved"));
  }

  if (saved) {
    return <p className="text-sm font-semibold text-brand">{message}</p>;
  }

  return (
    <form onSubmit={submit} className="max-w-xl">
      <h2 className="text-xl font-bold">{t("submitReview")}</h2>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label={t("reviewStars")}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= rating;

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={t("selectStars", { count: star })}
              onClick={() => setRating(star)}
              className="cursor-pointer rounded-md p-1"
            >
              <Star aria-hidden="true" className={`size-6 ${active ? "fill-[#dfb026] text-[#dfb026]" : "fill-transparent text-[#d5d5d5]"}`} />
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        required
        maxLength={2000}
        placeholder={t("reviewPlaceholder")}
        className="mt-4 min-h-28 w-full rounded-xl border border-[#e4ebe6] px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending || rating < 1}
        className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#157037] px-5 text-sm font-semibold text-white hover:bg-[#116332] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("reviewSubmit")}
      </button>
      {message ? <p className="mt-3 text-sm text-[#9a3412]">{message}</p> : null}
    </form>
  );
}
