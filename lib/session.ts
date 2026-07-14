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

/** Throws unless the signed-in user holds one of the given roles. */
export async function requireRole(...roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error(`Your role (${user.role.toLowerCase().replace("_", " ")}) doesn't allow this action.`);
  }
  return user;
}

/** The active company id for the signed-in user. */
export async function requireCompanyId() {
  const user = await requireUser();
  return user.companyId;
}
