"use client";

import { countries, findCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import "flag-icons/css/flag-icons.min.css";

function CountryFlag({ iso }: { iso: string }) {
  return <span aria-hidden="true" className={`fi fi-${iso.toLowerCase()} shrink-0 rounded-[2px] text-base`} />;
}

type PhoneFieldProps = {
  countryIso: string;
  onCountryIso: (iso: string) => void;
  phone: string;
  onPhone: (value: string) => void;
  searchLabel: string;
  countryLabel: string;
  numberLabel: string;
  placeholder?: string;
};

export function PhoneField({ countryIso, onCountryIso, phone, onPhone, searchLabel, countryLabel, numberLabel, placeholder }: PhoneFieldProps) {
  const locale = useLocale();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState("");
  const country = findCountry(countryIso) ?? findCountry("SA")!;
  const collator = useMemo(() => new Intl.Collator(locale === "ar" ? "ar" : "en"), [locale]);

  const choices = useMemo(() => {
    const term = query.trim().toLowerCase();
    return countries
      .filter((item) => {
        if (!term) {
          return true;
        }

        return item.en.toLowerCase().includes(term) || item.ar.includes(query.trim()) || item.dial.includes(term.replace("+", "")) || item.iso.toLowerCase().includes(term);
      })
      .sort((left, right) => collator.compare(locale === "ar" ? left.ar : left.en, locale === "ar" ? right.ar : right.en));
  }, [collator, locale, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function toggle() {
    const rect = rootRef.current?.getBoundingClientRect();
    setOpenUp(rect ? window.innerHeight - rect.bottom < 280 : false);
    setOpen((current) => !current);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex h-11 items-center rounded-lg border border-[#e5e7eb] bg-white" dir="ltr">
        <button type="button" aria-label={countryLabel} aria-expanded={open} aria-controls={listId} onClick={toggle} className="inline-flex h-full cursor-pointer items-center gap-1 px-2">
          <span className="inline-flex size-7 items-center justify-center overflow-hidden rounded-full bg-[#f3f6f4]">
            <CountryFlag iso={country.iso} />
          </span>
          <ChevronDown aria-hidden="true" className="size-3.5 text-[#6b7280]" />
        </button>
        <input
          required
          inputMode="numeric"
          aria-label={numberLabel}
          value={phone}
          placeholder={placeholder ?? "512345678"}
          onChange={(event) => onPhone(event.target.value.replace(/\D/g, "").slice(0, 15))}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
        />
      </div>
      {open ? (
        <div id={listId} className={cn("absolute z-30 w-full min-w-64 overflow-hidden rounded-xl border border-[#e4ebe6] bg-white shadow-[0_16px_40px_-24px_rgba(12,61,30,0.65)]", openUp ? "bottom-full mb-2" : "top-full mt-2")} dir={locale === "ar" ? "rtl" : "ltr"}>
          <div className="border-b border-[#eef2ef] p-2">
            <input
              value={query}
              autoFocus
              placeholder={searchLabel}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
              className="h-9 w-full rounded-lg bg-[#f4f7f5] px-3 text-sm outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {choices.map((item) => {
              const selected = item.iso === country.iso;
              return (
                <li key={item.iso}>
                  <button
                    type="button"
                    onClick={() => {
                      onCountryIso(item.iso);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn("flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm", selected ? "bg-[#157037] text-white" : "hover:bg-[#f3f8f4]")}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <CountryFlag iso={item.iso} />
                      <span className="truncate">{locale === "ar" ? item.ar : item.en}</span>
                    </span>
                    <span dir="ltr">+{item.dial}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
