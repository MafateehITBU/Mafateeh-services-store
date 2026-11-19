"use client";

import { PhoneField } from "@/components/storefront/phone-field";
import { Overlay } from "@/components/ui/overlay";
import { CUSTOMER_OTP_LENGTH, emptyOtpDigits, isValidNationalNumber, normalizeNationalNumber } from "@/validations/customer-auth";
import { ArrowLeft, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type AccountModalProps = {
  open: boolean;
  needsProfile: boolean;
  onClose: () => void;
};

type Step = "email" | "code" | "profile";

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function AccountModal({ open, needsProfile, onClose }: AccountModalProps) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [step, setStep] = useState<Step>(needsProfile ? "profile" : "email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(emptyOtpDigits);
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryIso, setCountryIso] = useState("SA");
  const [phone, setPhone] = useState("");
  const [seenOpen, setSeenOpen] = useState(open);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const checking = useRef(false);

  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open) {
      setStep(needsProfile ? "profile" : "email");
      setError(null);
    }
  }

  useEffect(() => {
    if (step !== "code" || seconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, seconds]);

  function close() {
    setError(null);
    onClose();
  }

  function finish() {
    close();
    router.refresh();
  }

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json().catch(() => null)) as { retryAfter?: number; error?: string } | null;
    setPending(false);

    if (!response.ok) {
      setError(response.status === 400 && payload?.error === "invalid_email" ? t("invalidEmail") : t("sendFailed"));
      return;
    }

    setDigits(emptyOtpDigits());
    setSeconds(payload?.retryAfter ?? 60);
    setStep("code");
    window.setTimeout(() => inputs.current[0]?.focus(), 50);
  }

  async function verify(code: string) {
    if (checking.current || code.length !== CUSTOMER_OTP_LENGTH) {
      return;
    }

    checking.current = true;
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const payload = (await response.json().catch(() => null)) as { needsProfile?: boolean } | null;
    checking.current = false;
    setPending(false);

    if (!response.ok) {
      setDigits(emptyOtpDigits());
      setError(t("invalidCode"));
      inputs.current[0]?.focus();
      return;
    }

    if (payload?.needsProfile) {
      setStep("profile");
      router.refresh();
      return;
    }

    finish();
  }

  function changeDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < CUSTOMER_OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (next.every((item) => item.length === 1)) {
      void verify(next.join(""));
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    if (pending) {
      return;
    }

    if (!isValidNationalNumber(countryIso, phone)) {
      setError(t("phoneInvalid"));
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, countryIso, phone: normalizeNationalNumber(phone) }),
    });
    setPending(false);

    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(body?.error === "invalid_phone" ? t("phoneInvalid") : t("profileInvalid"));
      return;
    }

    finish();
  }

  return (
    <Overlay open={open} onClose={close} titleId="account-modal-title" align="center" panelClassName="max-w-[22rem] rounded-2xl">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          {step === "code" ? (
            <button type="button" aria-label={t("back")} onClick={() => setStep("email")} className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6]">
              <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
            </button>
          ) : (
            <span className="size-8" />
          )}
          <button type="button" aria-label={t("close")} onClick={close} className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-[#e11d48] hover:bg-[#fdecec]">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <span className="mx-auto mt-1 flex size-16 items-center justify-center rounded-full border border-[#e5e7eb] text-[#9ca3af]">
          <UserRound aria-hidden="true" className="size-7" />
        </span>
        <h2 id="account-modal-title" className="mt-4 text-center text-lg font-bold">
          {t("title")}
        </h2>
        {step === "email" ? (
          <form className="mt-5" onSubmit={sendCode} noValidate>
            <label htmlFor="account-email" className="block text-start text-sm text-[#6b7280]">
              {t("emailLabel")}
            </label>
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="mt-2 h-11 w-full rounded-lg border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#111827]"
            />
            {error ? <p className="mt-2 text-sm text-[#9a3412]">{error}</p> : null}
            <button type="submit" disabled={pending} className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-[#111827] text-sm font-semibold text-white hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-60">
              {t("signIn")}
            </button>
          </form>
        ) : null}
        {step === "code" ? (
          <div className="mt-5">
            <p className="text-center text-sm text-[#6b7280]">{t("sentTo")}</p>
            <p className="mt-1 text-center text-sm font-semibold">{email}</p>
            <div className="mt-4 flex justify-center gap-2" dir="ltr">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    inputs.current[index] = node;
                  }}
                  value={digit}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={t("digit", { count: index + 1 })}
                  maxLength={1}
                  onChange={(event) => changeDigit(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !digits[index] && index > 0) {
                      inputs.current[index - 1]?.focus();
                    }
                  }}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CUSTOMER_OTP_LENGTH);
                    if (pasted.length === 0) {
                      return;
                    }
                    event.preventDefault();
                    const next = emptyOtpDigits();
                    pasted.split("").forEach((item, itemIndex) => {
                      next[itemIndex] = item;
                    });
                    setDigits(next);
                    if (pasted.length === CUSTOMER_OTP_LENGTH) {
                      void verify(pasted);
                    } else {
                      inputs.current[pasted.length]?.focus();
                    }
                  }}
                  className="h-12 w-11 rounded-lg border border-[#e5e7eb] text-center text-lg outline-none focus:border-[#111827]"
                />
              ))}
            </div>
            {error ? <p className="mt-3 text-center text-sm text-[#9a3412]">{error}</p> : null}
            <p className="mt-4 text-center text-sm text-[#6b7280]">
              {seconds > 0 ? (
                t("resendIn", { time: clock(seconds) })
              ) : (
                <button type="button" onClick={() => void sendCode()} disabled={pending} className="cursor-pointer font-semibold text-ink">
                  {t("resend")}
                </button>
              )}
            </p>
          </div>
        ) : null}
        {step === "profile" ? (
          <form className="mt-5 space-y-3" onSubmit={saveProfile}>
            <label className="block text-start text-sm text-[#6b7280]">
              {t("firstNameLabel")}
              <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder={t("firstNamePlaceholder")} className="mt-1 h-11 w-full rounded-lg border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#111827]" />
            </label>
            <label className="block text-start text-sm text-[#6b7280]">
              {t("lastNameLabel")}
              <input required value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder={t("lastNamePlaceholder")} className="mt-1 h-11 w-full rounded-lg border border-[#e5e7eb] px-3 text-sm outline-none focus:border-[#111827]" />
            </label>
            <div className="block text-start text-sm text-[#6b7280]">
              {t("phoneLabel")}
              <div className="mt-1">
                <PhoneField
                  countryIso={countryIso}
                  onCountryIso={setCountryIso}
                  phone={phone}
                  onPhone={setPhone}
                  searchLabel={t("searchCountry")}
                  countryLabel={t("countryCode")}
                  numberLabel={t("phoneLabel")}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-[#9a3412]">{error}</p> : null}
            <button type="submit" disabled={pending} className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-[#111827] text-sm font-semibold text-white hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-60">
              {t("register")}
            </button>
            <p className="text-center text-xs leading-5 text-[#9ca3af]">{t("privacy")}</p>
          </form>
        ) : null}
      </div>
    </Overlay>
  );
}
