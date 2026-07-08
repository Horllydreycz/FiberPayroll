/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { toStablecoin, DEFAULT_TAX_RATE } from "../lib/constants";

const prisma = new PrismaClient();

function cuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}
function wallet() {
  const chars = "0123456789abcdefghjkmnpqrstuvwxyz";
  let s = "ckt1qrejnmlar3r452tcg57gvq8patctcgy8acync9kxvgkkkxw8";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Seeding Fiber Payroll demo data…");

  // Reset (order matters for FKs)
  await prisma.settlementEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollBatch.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      id: cuid(),
      name: "Acme Global Inc.",
      country: "United States",
      defaultCurrency: "USD",
      defaultStablecoin: "RUSD",
      timezone: "America/New_York",
      fiberNodePubkey: "03b6a27c8...acme-treasury-node",
      balance: 480_000,
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.createMany({
    data: [
      {
        id: cuid(),
        email: "admin@fiberpayroll.dev",
        name: "Ada Founder",
        passwordHash,
        role: "ADMIN",
        companyId: company.id,
      },
      {
        id: cuid(),
        email: "finance@fiberpayroll.dev",
        name: "Femi Finance",
        passwordHash,
        role: "FINANCE_MANAGER",
        companyId: company.id,
      },
    ],
  });

  const people = [
    ["Maria Silva", "Brazil", "BRL", "Senior Engineer", "Engineering", 9500],
    ["Chidi Okafor", "Nigeria", "NGN", "Backend Engineer", "Engineering", 6500],
    ["Priya Nair", "India", "INR", "Product Designer", "Design", 5200],
    ["James Whitfield", "United Kingdom", "GBP", "Engineering Manager", "Engineering", 11000],
    ["Lena Müller", "Germany", "EUR", "Data Scientist", "Data", 8800],
    ["Carlos Mendoza", "Mexico", "USD", "DevOps Engineer", "Engineering", 7800],
    ["Aisha Bello", "Nigeria", "NGN", "Frontend Engineer", "Engineering", 6000],
    ["Sophie Laurent", "France", "EUR", "Marketing Lead", "Marketing", 7200],
    ["Daniel Kim", "South Korea", "USD", "Mobile Engineer", "Engineering", 8200],
    ["Olivia Brown", "United States", "USD", "Head of People", "Operations", 9800],
    ["Rahul Sharma", "India", "INR", "QA Engineer", "Engineering", 4800],
    [" Throwaway", "United States", "USD", "Contractor", "Engineering", 6000],
  ] as const;

  const employees = [];
  for (const [fullName, country, stable, jobTitle, department, salary] of people) {
    const name = fullName === " Throwaway" ? "Tomás Costa" : fullName;
    const emp = await prisma.employee.create({
      data: {
        id: cuid(),
        fullName: name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@acme.example`,
        country,
        jobTitle,
        department,
        walletAddress: wallet(),
        preferredStablecoin: pick(["RUSD", "USDI", "USDC"]),
        salaryAmount: salary,
        currency: "USD", // salaries denominated in USD for the demo
        paymentFrequency: "MONTHLY",
        employmentType: jobTitle === "Contractor" ? "CONTRACTOR" : "FULL_TIME",
        taxId: `TAX-${Math.floor(100000 + Math.random() * 899999)}`,
        status: "ACTIVE",
        companyId: company.id,
      },
    });
    employees.push(emp);
  }

  // A completed payroll for last month, fully settled with payslips.
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5);
  const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  const batch = await prisma.payrollBatch.create({
    data: {
      id: cuid(),
      reference: `PR-${monthKey}-001`,
      payrollMonth: monthKey,
      status: "COMPLETED",
      stablecoin: "RUSD",
      createdByName: "Femi Finance",
      approvedAt: lastMonth,
      completedAt: new Date(lastMonth.getTime() + 1000 * 60 * 4),
      createdAt: lastMonth,
      companyId: company.id,
    },
  });

  let total = 0;
  let psCount = 0;
  for (const emp of employees) {
    const gross = emp.salaryAmount;
    const tax = Math.round(gross * DEFAULT_TAX_RATE * 100) / 100;
    const net = gross - tax;
    const stableAmt = toStablecoin(net, emp.currency);
    total += stableAmt;

    const item = await prisma.payrollItem.create({
      data: {
        id: cuid(),
        grossAmount: gross,
        taxAmount: tax,
        netAmount: net,
        currency: emp.currency,
        stablecoinAmount: stableAmt,
        stablecoin: "RUSD",
        walletAddress: emp.walletAddress,
        status: "SETTLED",
        batchId: batch.id,
        employeeId: emp.id,
        createdAt: lastMonth,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        id: cuid(),
        paymentHash: "0x" + Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""),
        invoice: "fibt1" + Array.from({ length: 48 }, () => "0123456789abcdefghjkmnpqrstuvwxyz"[Math.floor(Math.random() * 33)]).join(""),
        amount: stableAmt,
        stablecoin: "RUSD",
        status: "SUCCESS",
        fee: Math.round(stableAmt * 0.0002 * 100) / 100,
        routeHops: 1 + Math.floor(Math.random() * 3),
        settledAt: new Date(lastMonth.getTime() + 1000 * 60 * 3),
        payrollItemId: item.id,
        createdAt: lastMonth,
      },
    });

    for (const [i, stage] of ["PAYMENT_REQUESTED", "BROADCAST", "CONFIRMED", "SETTLED"].entries()) {
      await prisma.settlementEvent.create({
        data: {
          id: cuid(),
          stage,
          paymentId: payment.id,
          createdAt: new Date(lastMonth.getTime() + i * 20000),
        },
      });
    }

    await prisma.payslip.create({
      data: {
        id: cuid(),
        number: `PS-${lastMonth.getFullYear()}-${String(++psCount).padStart(5, "0")}`,
        verifyToken: cuid() + cuid(),
        payrollItemId: item.id,
        employeeId: emp.id,
        createdAt: lastMonth,
      },
    });
  }

  await prisma.payrollBatch.update({
    where: { id: batch.id },
    data: { totalAmount: Math.round(total * 100) / 100 },
  });

  await prisma.auditLog.createMany({
    data: [
      { id: cuid(), companyId: company.id, action: "PAYROLL_COMPLETED", detail: `${batch.reference} completed`, actorName: "Femi Finance" },
      { id: cuid(), companyId: company.id, action: "PAYROLL_APPROVED", detail: `${batch.reference} approved`, actorName: "Ada Founder" },
      { id: cuid(), companyId: company.id, action: "EMPLOYEE_IMPORTED", detail: `${employees.length} employees imported`, actorName: "Ada Founder" },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { id: cuid(), companyId: company.id, type: "success", title: "Payroll completed", body: `${batch.reference}: ${employees.length}/${employees.length} paid.` },
      { id: cuid(), companyId: company.id, type: "info", title: "Welcome to Fiber Payroll", body: "Run your first payroll in under 5 minutes." },
    ],
  });

  console.log(`✅ Seeded company "${company.name}" with ${employees.length} employees.`);
  console.log("   Login: admin@fiberpayroll.dev / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
