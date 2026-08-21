"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

type AuthMenuProps = {
  userId: string | null;
};

export function AuthMenu({ userId }: AuthMenuProps) {
  if (userId) {
    return <UserButton />;
  }

  return (
    <Link
      href="/sign-in"
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      Sign in
    </Link>
  );
}
