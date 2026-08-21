import { Navbar } from "@/components/layout/navbar";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
