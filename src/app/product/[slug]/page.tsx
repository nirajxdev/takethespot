import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { getProductBySlug } from "@/actions/products";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Back to dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            {product.logoUrl ? (
              <Image
                src={product.logoUrl}
                alt={`${product.name} logo`}
                width={64}
                height={64}
                className="rounded-lg border object-cover"
                unoptimized
              />
            ) : null}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{product.name}</CardTitle>
                <Badge variant={product.isActive ? "default" : "secondary"}>
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardDescription className="mt-2">
                {product.description || "No description provided."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-medium">Owner</p>
              <p className="text-muted-foreground">
                {product.user.name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="font-medium">Territories</p>
              <p className="text-muted-foreground">
                {product._count.territories}
              </p>
            </div>
          </div>

          {product.websiteUrl ? (
            <a
              href={product.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ExternalLink className="size-4" />
              Visit website
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
