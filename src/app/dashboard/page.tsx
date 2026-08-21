import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getUserProducts } from "@/actions/products";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProductCard } from "@/components/product/product-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ensureUser } from "@/lib/auth";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  await ensureUser();
  const products = await getUserProducts(userId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your products and territory.
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className={cn(buttonVariants())}
        >
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create your first product to get on the billboard."
          actionLabel="Create product"
          actionHref="/dashboard/products/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              description={product.description}
              websiteUrl={product.websiteUrl}
              isActive={product.isActive}
              territoryCount={product._count.territories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
