import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { AuthMenu } from "@/components/layout/auth-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Explore Board" },
  { href: "/how-it-works", label: "How It Works" },
];

export async function Navbar() {
  const { userId } = await auth();

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold tracking-tight">
            TakeTheSpot
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
          >
            Claim a Spot
          </Link>
          {userId ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Dashboard
            </Link>
          ) : null}
          <AuthMenu userId={userId} />
        </div>
      </div>
    </header>
  );
}
