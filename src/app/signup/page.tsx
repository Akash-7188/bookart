import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { Skeleton } from "@/components/ui";

export const metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-10">
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
