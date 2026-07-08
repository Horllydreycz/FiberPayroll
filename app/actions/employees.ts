"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cuid } from "@/lib/utils";

const employeeSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  country: z.string().min(2),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  walletAddress: z.string().min(6),
  preferredStablecoin: z.string().default("RUSD"),
  salaryAmount: z.coerce.number().positive(),
  currency: z.string().default("USD"),
  paymentFrequency: z.string().default("MONTHLY"),
  employmentType: z.string().default("FULL_TIME"),
  taxId: z.string().optional(),
  status: z.string().default("ACTIVE"),
  notes: z.string().optional(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

export async function createEmployee(data: EmployeeInput) {
  const user = await requireUser();
  const parsed = employeeSchema.parse(data);
  await prisma.employee.create({
    data: { id: cuid(), ...parsed, companyId: user.companyId },
  });
  await prisma.auditLog.create({
    data: { id: cuid(), companyId: user.companyId, action: "EMPLOYEE_CREATED", detail: parsed.fullName, actorName: user.name },
  });
  revalidatePath("/dashboard/employees");
  return { ok: true };
}

export async function updateEmployee(id: string, data: EmployeeInput) {
  const user = await requireUser();
  const parsed = employeeSchema.parse(data);
  await prisma.employee.update({
    where: { id, companyId: user.companyId },
    data: parsed,
  });
  revalidatePath("/dashboard/employees");
  return { ok: true };
}

export async function deleteEmployee(id: string) {
  const user = await requireUser();
  const emp = await prisma.employee.findFirst({ where: { id, companyId: user.companyId } });
  if (!emp) return { ok: false, error: "Not found" };
  await prisma.employee.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { id: cuid(), companyId: user.companyId, action: "EMPLOYEE_DELETED", detail: emp.fullName, actorName: user.name },
  });
  revalidatePath("/dashboard/employees");
  return { ok: true };
}

const importRowSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  country: z.string().min(1),
  jobTitle: z.string().optional().default(""),
  department: z.string().optional().default(""),
  walletAddress: z.string().min(1),
  preferredStablecoin: z.string().optional().default("RUSD"),
  salaryAmount: z.coerce.number().positive(),
  currency: z.string().optional().default("USD"),
  paymentFrequency: z.string().optional().default("MONTHLY"),
  employmentType: z.string().optional().default("FULL_TIME"),
  taxId: z.string().optional().default(""),
});

/** Bulk import pre-validated rows from the CSV preview. Skips duplicates by email. */
export async function importEmployees(rows: unknown[]) {
  const user = await requireUser();
  const existing = await prisma.employee.findMany({
    where: { companyId: user.companyId },
    select: { email: true },
  });
  const seen = new Set(existing.map((e) => e.email.toLowerCase()));

  let imported = 0;
  let skipped = 0;
  for (const raw of rows) {
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const email = parsed.data.email.toLowerCase();
    if (seen.has(email)) {
      skipped++;
      continue;
    }
    seen.add(email);
    await prisma.employee.create({
      data: {
        id: cuid(),
        ...parsed.data,
        email,
        status: "ACTIVE",
        companyId: user.companyId,
      },
    });
    imported++;
  }

  await prisma.auditLog.create({
    data: {
      id: cuid(),
      companyId: user.companyId,
      action: "EMPLOYEE_IMPORTED",
      detail: `Imported ${imported}, skipped ${skipped}`,
      actorName: user.name,
    },
  });
  revalidatePath("/dashboard/employees");
  return { ok: true, imported, skipped };
}
