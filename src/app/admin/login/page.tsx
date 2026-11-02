import { LoginForm } from "@/components/dashboard/login-form";
import { Suspense } from "react";

export const metadata = { title: "Sign in" };

export const instant = false;

async function LoginNotice({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;

  return <LoginForm notice={params.notice === "signed-out" ? "You have signed out." : null} />;
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  return (
    <Suspense fallback={<LoginForm notice={null} />}>
      <LoginNotice searchParams={searchParams} />
    </Suspense>
  );
}
