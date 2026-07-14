"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const schema = z.object({
  name: z.string().min(2),
  defaultCurrency: z.string(),
  defaultStablecoin: z.string(),
  timezone: z.string(),
});

export async function updateCompany(data: z.infer<typeof schema>) {
  const user = await requireRole("ADMIN");
  const parsed = schema.parse(data);
  await prisma.company.update({ where: { id: user.companyId }, data: parsed });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
