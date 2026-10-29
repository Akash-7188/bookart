import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5 sm:py-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
