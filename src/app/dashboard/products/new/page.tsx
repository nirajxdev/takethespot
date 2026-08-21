import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CreateProductForm } from "@/components/product/create-product-form";
import { ensureUser } from "@/lib/auth";

export default async function NewProductPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  await ensureUser();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <CreateProductForm />
    </div>
  );
}
