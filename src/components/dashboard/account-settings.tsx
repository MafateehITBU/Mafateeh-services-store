"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/dashboard/loading-state";

type Account = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

const fieldClass = "h-11 w-full rounded-full border border-line bg-white px-4 text-sm";

export function AccountSettings() {
  const [account, setAccount] = useState<Account | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await fetch("/api/admin/account");
        const body = (await response.json().catch(() => null)) as Account & { message?: string };
        if (!response.ok) {
          setError(body?.message || "Account settings could not be loaded.");
          setLoading(false);
          return;
        }
        setAccount(body);
        setFirstName(body.firstName);
        setLastName(body.lastName);
        setEmail(body.email);
        setLoading(false);
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(payload: Record<string, string>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    const response = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as { message?: string; email?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body?.message || "The account could not be updated.");
      return;
    }
    if (body.email) setEmail(body.email);
    setCurrentPassword("");
    setNextPassword("");
    setNotice(success);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {notice ? <p className="rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-rich xl:col-span-2">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger xl:col-span-2">{error}</p> : null}
      <form
        className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]"
        onSubmit={(event) => {
          event.preventDefault();
          void save({ firstName, lastName }, "Display name updated.");
        }}
      >
        <h2 className="text-lg font-bold">Display name</h2>
        <p className="text-sm text-muted">Role: {account?.role === "SUPER_ADMIN" ? "Super administrator" : "Administrator"}</p>
        <label className="block text-sm font-semibold">First name
          <input className={`${fieldClass} mt-2`} value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={80} />
        </label>
        <label className="block text-sm font-semibold">Last name
          <input className={`${fieldClass} mt-2`} value={lastName} onChange={(event) => setLastName(event.target.value)} required maxLength={80} />
        </label>
        <Button type="submit" disabled={busy}>Save name</Button>
      </form>
      <form
        className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]"
        onSubmit={(event) => {
          event.preventDefault();
          void save({ email, currentPassword }, "Email updated.");
        }}
      >
        <h2 className="text-lg font-bold">Email</h2>
        <label className="block text-sm font-semibold">Administrator email
          <input className={`${fieldClass} mt-2`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
        </label>
        <label className="block text-sm font-semibold">Current password
          <input className={`${fieldClass} mt-2`} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" />
        </label>
        <Button type="submit" disabled={busy}>Save email</Button>
      </form>
      <form
        className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] xl:col-span-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save({ currentPassword, nextPassword }, "Password updated.");
        }}
      >
        <h2 className="text-lg font-bold">Password</h2>
        <p className="text-sm text-muted">Enter the current password before choosing a new one. Customer sign-in stays email OTP.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold">Current password
            <input className={`${fieldClass} mt-2`} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" />
          </label>
          <label className="block text-sm font-semibold">New password
            <input className={`${fieldClass} mt-2`} type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} required minLength={12} autoComplete="new-password" />
          </label>
        </div>
        <Button type="submit" disabled={busy}>Change password</Button>
      </form>
    </div>
  );
}
