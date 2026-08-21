import Link from "next/link";
import { ExternalLink } from "lucide-react";

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

type ProductCardProps = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  territoryCount: number;
};

export function ProductCard({
  name,
  slug,
  description,
  websiteUrl,
  isActive,
  territoryCount,
}: ProductCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {description || "No description yet."}
            </CardDescription>
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {territoryCount} territor{territoryCount === 1 ? "y" : "ies"}
        </p>
        <div className="flex gap-2">
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ExternalLink className="size-4" />
              Website
            </a>
          ) : null}
          <Link
            href={`/product/${slug}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            View
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
