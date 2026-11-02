"use client";

import { Button } from "@/components/ui/button";
import { adminLoginSchema } from "@/validations/admin-auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type LoginValues = {
  email: string;
  password: string;
};

export function LoginForm({ notice }: { notice: string | null }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(notice);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const form = useForm<LoginValues>({ defaultValues: { email: "", password: "" } });

  async function signIn(values: LoginValues) {
    const parsed = adminLoginSchema.safeParse(values);

    if (!parsed.success) {
      form.setError("email", { message: "Enter the administrator email and password." });
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const body = (await response.json()) as { message?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.message ?? "The email or password is not valid.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f4] px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-panel)]">
        <div className="flex justify-center bg-brand-deep px-6 py-6">
          <Image src="/images/logo-white.png" alt="Mafateeh" width={438} height={117} priority className="h-12 w-auto" />
        </div>
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-ink">Administrator sign in</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Sign in with the administrator email and password. Customer accounts use a one-time email code and cannot open this area.
          </p>
          {message ? (
            <p role="status" className="mt-4 rounded-2xl bg-canvas-muted px-4 py-3 text-sm text-ink">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(signIn)} noValidate>
            <div>
              <label htmlFor="admin-email" className="text-sm font-semibold">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                aria-invalid={Boolean(form.formState.errors.email)}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas-muted px-4 text-base outline-none focus:border-brand aria-invalid:border-danger"
                {...form.register("email")}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="text-sm font-semibold">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas-muted px-4 text-base outline-none focus:border-brand aria-invalid:border-danger"
                {...form.register("password")}
              />
              {form.formState.errors.email ? (
                <p className="mt-2 text-sm text-danger">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Checking" : "Sign in"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
