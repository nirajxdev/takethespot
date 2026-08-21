"use server";

import { revalidatePath } from "next/cache";
import slugify from "slugify";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";
import type { Product } from "@/generated/prisma/client";

async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name, { lower: true, strict: true }) || "product";
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function createProduct(
  input: unknown,
): Promise<ActionResult<Product>> {
  try {
    const user = await requireUser();
    const parsed = createProductSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid product data",
      };
    }

    const { name, description, websiteUrl, logoUrl } = parsed.data;
    const slug = await generateUniqueSlug(name);

    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name,
        slug,
        description: description || null,
        websiteUrl: websiteUrl || null,
        logoUrl: logoUrl || null,
      },
    });

    await prisma.activity.create({
      data: {
        userId: user.id,
        productId: product.id,
        type: "PRODUCT_CREATED",
        metadata: { name: product.name, slug: product.slug },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/product/${product.slug}`);

    return { success: true, data: product };
  } catch (error) {
    console.error("createProduct error:", error);
    return {
      success: false,
      error: "Failed to create product. Please try again.",
    };
  }
}

export async function getUserProducts(userId: string) {
  return prisma.product.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { territories: true },
      },
    },
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
      _count: {
        select: { territories: true },
      },
    },
  });
}
