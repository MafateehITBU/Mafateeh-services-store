"use client";

import { PhoneField } from "@/components/storefront/phone-field";
import { StoredImage } from "@/components/ui/stored-image";
import { isValidNationalNumber, normalizeNationalNumber } from "@/validations/customer-auth";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type AccountFormProps = {
  firstName: string;
  lastName: string;
  email: string;
  countryIso: string;
  phone: string;
  avatarUrl: string | null;
};

export function AccountForm(initial: AccountFormProps) {
  const t = useTranslations("Profile");
  const account = useTranslations("Account");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [countryIso, setCountryIso] = useState(initial.countryIso);
  const [phone, setPhone] = useState(initial.phone);
  const [avatar, setAvatar] = useState<string | null>(initial.avatarUrl);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState<string | null>(null);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [seconds, setSeconds] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const checking = useRef(false);

  useEffect(() => {
    if (!confirmingEmail || seconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [confirmingEmail, seconds]);

  function clock(value: number) {
    const minutes = Math.floor(value / 60);
    const rest = value % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function chooseImage(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError(t("imageInvalid"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result.replace(/^data:image\/jpg;/, "data:image/jpeg;") : "";

      if (!/^data:image\/(png|jpeg|webp);base64,/.test(value)) {
        setError(t("imageInvalid"));
        return;
      }

      setAvatar(value);
      setAvatarChanged(true);
      setSaved(false);
      setError(null);
    };
    reader.onerror = () => setError(t("imageInvalid"));
    reader.readAsDataURL(file);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();

    if (pending) {
      return;
    }

    if (!isValidNationalNumber(countryIso, phone)) {
      setError(account("phoneInvalid"));
      setSaved(false);
      return;
    }

    setPending(true);
    setError(null);
    setSaved(false);
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        countryIso,
        phone: normalizeNationalNumber(phone),
        ...(avatarChanged && avatar ? { avatar } : {}),
      }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string; emailConfirmation?: boolean; retryAfter?: number } | null;
    setPending(false);

    if (!response.ok) {
      setError(body?.error === "invalid_phone" ? account("phoneInvalid") : body?.error === "email_taken" ? t("emailTaken") : body?.error === "invalid_image" ? t("imageInvalid") : body?.error === "send_failed" ? account("sendFailed") : t("saveFailed"));
      return;
    }

    setAvatarChanged(false);

    if (body?.emailConfirmation) {
      setConfirmingEmail(email.trim().toLowerCase());
      setDigits(["", "", "", ""]);
      setSeconds(body.retryAfter ?? 60);
      window.setTimeout(() => inputs.current[0]?.focus(), 0);
      return;
    }

    setConfirmingEmail(null);
    setEmailConfirmed(false);
    setSaved(true);
    router.refresh();
  }

  async function resendCode() {
    if (!confirmingEmail || pending) {
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch("/api/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: confirmingEmail }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string; retryAfter?: number } | null;
    setPending(false);

    if (!response.ok) {
      setError(body?.error === "send_failed" ? account("sendFailed") : t("saveFailed"));
      return;
    }

    setSeconds(body?.retryAfter ?? 60);
  }

  async function verifyCode(code: string) {
    if (!confirmingEmail || checking.current) {
      return;
    }

    checking.current = true;
    setPending(true);
    setError(null);
    const response = await fetch("/api/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: confirmingEmail, code }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    checking.current = false;
    setPending(false);

    if (!response.ok) {
      setError(body?.error === "email_taken" ? t("emailTaken") : account("invalidCode"));
      setDigits(["", "", "", ""]);
      inputs.current[0]?.focus();
      return;
    }

    setConfirmingEmail(null);
    setEmailConfirmed(true);
    setSaved(true);
    router.refresh();
  }

  function changeDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    if (next.every((item) => item.length === 1)) {
      void verifyCode(next.join(""));
    }
  }

  return (
    <form className="max-w-2xl" onSubmit={save}>
      <h1 className="text-xl font-bold">{t("myAccount")}</h1>
      <div className="mt-6 flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="relative size-20 cursor-pointer overflow-hidden rounded-full border border-[#e4ebe6] bg-[#f3f8f4]">
          {avatar ? <StoredImage src={avatar} alt="" className="size-20 rounded-full" /> : <UserRound aria-hidden="true" className="absolute inset-0 m-auto size-8 text-[#157037]" />}
        </button>
        <div>
          <p className="text-sm font-semibold">{t("picture")}</p>
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 cursor-pointer text-sm font-semibold text-[#157037]">{t("upload")}</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              chooseImage(file);
            }
          }}
        />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-[#5d6b62]">
          {t("firstName")}
          <input required value={firstName} onChange={(event) => { setFirstName(event.target.value); setSaved(false); }} className="mt-1 h-11 w-full rounded-lg border border-[#e5e7eb] px-3 text-sm text-ink outline-none focus:border-[#157037]" />
        </label>
        <label className="text-sm text-[#5d6b62]">
          {t("lastName")}
          <input required value={lastName} onChange={(event) => { setLastName(event.target.value); setSaved(false); }} className="mt-1 h-11 w-full rounded-lg border border-[#e5e7eb] px-3 text-sm text-ink outline-none focus:border-[#157037]" />
        </label>
        <label className="text-sm text-[#5d6b62] md:col-span-2">
          {t("email")}
          <input required type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false); setEmailConfirmed(false); if (confirmingEmail && event.target.value.trim().toLowerCase() !== confirmingEmail) setConfirmingEmail(null); }} className="mt-1 h-11 w-full rounded-lg border border-[#e5e7eb] px-3 text-sm text-ink outline-none focus:border-[#157037]" />
        </label>
        <div className="text-sm text-[#5d6b62] md:col-span-2">
          {t("phone")}
          <div className="mt-1 max-w-md">
            <PhoneField
              countryIso={countryIso}
              onCountryIso={(iso) => { setCountryIso(iso); setSaved(false); }}
              phone={phone}
              onPhone={(value) => { setPhone(value); setSaved(false); }}
              searchLabel={t("searchCountry")}
              countryLabel={account("countryCode")}
              numberLabel={t("phone")}
            />
          </div>
        </div>
      </div>
      {confirmingEmail ? (
        <div className="mt-5">
          <p className="text-sm text-[#5d6b62]">{t("emailCodeSent", { email: confirmingEmail })}</p>
          <div className="mt-3 flex gap-2" dir="ltr">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputs.current[index] = node;
                }}
                value={digit}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={account("digit", { count: index + 1 })}
                maxLength={1}
                onChange={(event) => changeDigit(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digits[index] && index > 0) {
                    inputs.current[index - 1]?.focus();
                  }
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
                  if (pasted.length === 0) {
                    return;
                  }
                  event.preventDefault();
                  const next = ["", "", "", ""];
                  pasted.split("").forEach((item, itemIndex) => {
                    next[itemIndex] = item;
                  });
                  setDigits(next);
                  if (pasted.length === 4) {
                    void verifyCode(pasted);
                  } else {
                    inputs.current[pasted.length]?.focus();
                  }
                }}
                className="h-12 w-11 rounded-lg border border-[#e5e7eb] text-center text-lg outline-none focus:border-[#157037]"
              />
            ))}
          </div>
          <p className="mt-3 text-sm text-[#5d6b62]">
            {seconds > 0 ? (
              account("resendIn", { time: clock(seconds) })
            ) : (
              <button type="button" onClick={() => void resendCode()} disabled={pending} className="cursor-pointer font-semibold text-[#157037]">
                {account("resend")}
              </button>
            )}
          </p>
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm text-[#9a3412]">{error}</p> : null}
      {saved ? <p role="status" className="mt-4 text-sm font-semibold text-[#157037]">{emailConfirmed ? t("emailConfirmed") : t("saved")}</p> : null}
      <button type="submit" disabled={pending} className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center rounded-lg bg-[#157037] px-6 text-sm font-semibold text-white hover:bg-[#116332] disabled:cursor-not-allowed disabled:opacity-60">
        {t("save")}
      </button>
    </form>
  );
}
