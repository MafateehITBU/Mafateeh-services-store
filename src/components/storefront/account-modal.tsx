"use client";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Overlay } from "@/components/ui/overlay";
import { prepareEmailSignIn } from "@/features/auth/prepare-email-sign-in";
import { emailSignInSchema } from "@/validations/email-sign-in";
import { UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

type AccountModalProps = {
  open: boolean;
  onClose: () => void;
};

type AccountFormValues = {
  email: string;
};

export function AccountModal({ open, onClose }: AccountModalProps) {
  const t = useTranslations("Account");
  const [pendingIntegration, setPendingIntegration] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AccountFormValues>({
    defaultValues: { email: "" },
  });

  function close() {
    reset();
    setPendingIntegration(false);
    onClose();
  }

  function onSubmit(values: AccountFormValues) {
    const parsed = emailSignInSchema.safeParse(values);

    if (!parsed.success) {
      setError("email", { message: t("invalidEmail") });
      setPendingIntegration(false);
      return;
    }

    const intent = prepareEmailSignIn(parsed.data.email);
    setPendingIntegration(intent.status === "pending_integration");
  }

  const emailError = errors.email?.message;

  return (
    <Overlay open={open} onClose={close} titleId="account-modal-title" align="center">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
            <UserRound aria-hidden="true" className="size-7" />
          </span>
          <IconButton label={t("close")} onClick={close} className="text-ink hover:bg-canvas-muted">
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
        <h2 id="account-modal-title" className="mt-5 text-2xl font-bold">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{t("intro")}</p>
        <form className="mt-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label htmlFor="account-email" className="text-sm font-semibold">
            {t("emailLabel")}
          </label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "account-email-error" : undefined}
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas-muted px-4 text-base outline-none focus:border-brand aria-invalid:border-danger"
            {...register("email")}
          />
          {emailError ? (
            <p id="account-email-error" className="mt-2 text-sm text-danger">
              {emailError}
            </p>
          ) : null}
          {pendingIntegration ? (
            <p className="mt-3 text-sm text-muted" role="status">
              {t("notConnected")}
            </p>
          ) : null}
          <Button type="submit" className="mt-5 w-full">
            {t("continue")}
          </Button>
        </form>
      </div>
    </Overlay>
  );
}
