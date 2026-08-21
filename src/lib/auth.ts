import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function ensureUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    return null;
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  return prisma.user.upsert({
    where: { id: clerkUser.id },
    update: {
      name,
      email,
      image: clerkUser.imageUrl,
    },
    create: {
      id: clerkUser.id,
      name,
      email,
      image: clerkUser.imageUrl,
    },
  });
}

export async function requireUser() {
  const user = await ensureUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
