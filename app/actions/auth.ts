"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cuid } from "@/lib/utils";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function authenticate(_prev: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error; // re-throw redirects
  }
}

const registerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  name: z.string().min(2, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function registerCompany(_prev: string | undefined, formData: FormData) {
  const parsed = registerSchema.safeParse({
    companyName: formData.get("companyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid details.";
  }
  const { companyName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return "An account with that email already exists.";

  const company = await prisma.company.create({
    data: { id: cuid(), name: companyName, balance: 100_000 },
  });
  await prisma.user.create({
    data: {
      id: cuid(),
      email: email.toLowerCase(),
      name,
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
      companyId: company.id,
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return "Account created — please log in.";
    throw error;
  }
}
