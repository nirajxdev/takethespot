"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthMenu() {
  const { isSignedIn, isLoaded } = useAuth();

  if (isLoaded && isSignedIn) {
    return <UserButton />;
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/sign-in"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Sign in
      </Link>
      <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
        Sign up
      </Link>
    </div>
  );
}
