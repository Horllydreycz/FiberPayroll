import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Returns the signed-in user with their company, or null. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true },
  });
}

/** Like getCurrentUser but throws — use in places that are already protected. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** The active company id for the signed-in user. */
export async function requireCompanyId() {
  const user = await requireUser();
  return user.companyId;
}
