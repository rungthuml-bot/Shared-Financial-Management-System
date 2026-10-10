/**
 * Verification Suite for Phase UX-3: Simplified Create Installment Form
 * Tests Basic Personal, Advanced Personal, Shared, and Validation Flows against real PostgreSQL.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { InstallmentService } from "../src/services/installment.service";
import { createInstallmentSchema } from "../src/validators/installment";

const prisma = new PrismaClient();

async function runUX3Tests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING PHASE UX-3 FORM CREATION & DATA INTEGRITY TESTS");
  console.log("=======================================================\n");

  const userA = await prisma.user.findFirstOrThrow({ where: { email: "usera@example.com" } });
  const userB = await prisma.user.findFirstOrThrow({ where: { email: "userb@example.com" } });
  const provider = await prisma.provider.findFirstOrThrow({ where: { slug: "shopee" } });
  const category = await prisma.category.findFirstOrThrow({ where: { slug: "shopping" } });

  // Clean up any existing test records
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[UX3-TEST]" } },
  });

  // -------------------------------------------------------------
  // TEST A: Basic Personal Installment (Only essential visible fields)
  // -------------------------------------------------------------
  console.log("▶️ TEST A: Basic Personal Installment (Only essential fields entered)");
  const basicInput = {
    name: "[UX3-TEST] Basic iPad Air",
    providerId: provider.id,
    totalAmount: 18000,
    totalInstallments: 6,
    startDate: "2026-11-15",
    dueDay: 15,
    // Defaults applied by form for un-opened advanced options
    downPayment: 0,
    ownershipType: "PERSONAL" as const,
    splitType: "NONE" as const,
    userSharePercent: 100,
    partnerSharePercent: 0,
  };

  const parsedBasic = createInstallmentSchema.safeParse(basicInput);
  if (!parsedBasic.success) {
    throw new Error(`Basic schema validation failed: ${JSON.stringify(parsedBasic.error)}`);
  }

  const basicInst = await InstallmentService.createInstallment(userA.id, parsedBasic.data);
  const dbBasic = await prisma.installment.findUniqueOrThrow({
    where: { id: basicInst.id },
    include: { payments: { include: { splits: true } } },
  });

  if (dbBasic.name !== "[UX3-TEST] Basic iPad Air") throw new Error("Name mismatch");
  if (dbBasic.ownershipType !== "PERSONAL") throw new Error("Expected PERSONAL ownership");
  if (dbBasic.partnerId !== null) throw new Error("Partner must be null for personal");
  if (dbBasic.payments.length !== 6) throw new Error(`Expected 6 payments, got ${dbBasic.payments.length}`);
  
  for (const p of dbBasic.payments) {
    if (new Prisma.Decimal(p.amount).toNumber() !== 3000) {
      throw new Error(`Expected 3000 monthly payment, got ${p.amount}`);
    }
    if (p.splits.length !== 0) throw new Error("Personal installment must have 0 splits");
  }
  console.log("  ✅ PASS: Basic personal installment saved in PostgreSQL with exact ฿3,000.00/month schedule");

  // -------------------------------------------------------------
  // TEST B: Advanced Personal Installment (With downPayment, category, note)
  // -------------------------------------------------------------
  console.log("\n▶️ TEST B: Advanced Personal Installment (Down payment ฿5,000 on ฿25,000 / 10 months)");
  const advancedInput = {
    name: "[UX3-TEST] Advanced Refrigerator",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 25000,
    downPayment: 5000,
    totalInstallments: 10,
    startDate: "2026-11-05",
    dueDay: 5,
    description: "ตู้เย็น 2 ประตู Inverter",
    note: "ผ่อน 0% 10 เดือน พร้อมดาวน์ 5,000",
    ownershipType: "PERSONAL" as const,
    splitType: "NONE" as const,
    userSharePercent: 100,
    partnerSharePercent: 0,
  };

  const parsedAdv = createInstallmentSchema.safeParse(advancedInput);
  if (!parsedAdv.success) {
    throw new Error(`Advanced schema validation failed: ${JSON.stringify(parsedAdv.error)}`);
  }

  const advInst = await InstallmentService.createInstallment(userA.id, parsedAdv.data);
  const dbAdv = await prisma.installment.findUniqueOrThrow({
    where: { id: advInst.id },
    include: { payments: true },
  });

  if (new Prisma.Decimal(dbAdv.downPayment).toNumber() !== 5000) throw new Error("Down payment mismatch");
  if (dbAdv.description !== "ตู้เย็น 2 ประตู Inverter") throw new Error("Description mismatch");
  if (dbAdv.note !== "ผ่อน 0% 10 เดือน พร้อมดาวน์ 5,000") throw new Error("Note mismatch");
  if (dbAdv.categoryId !== category.id) throw new Error("Category mismatch");
  
  // Principal = 25000 - 5000 = 20000; / 10 = 2000
  for (const p of dbAdv.payments) {
    if (new Prisma.Decimal(p.amount).toNumber() !== 2000) {
      throw new Error(`Expected 2000 monthly payment, got ${p.amount}`);
    }
  }
  console.log("  ✅ PASS: Advanced personal installment saved with down payment and ฿2,000.00/month schedule");

  // -------------------------------------------------------------
  // TEST C: Shared Installments (50/50 and Custom Percent)
  // -------------------------------------------------------------
  console.log("\n▶️ TEST C1: Shared 50/50 Installment (฿10,000 / 5 months shared with User B)");
  const shared50Input = {
    name: "[UX3-TEST] Shared 50/50 Dyson",
    providerId: provider.id,
    totalAmount: 10000,
    downPayment: 0,
    totalInstallments: 5,
    startDate: "2026-12-01",
    dueDay: 1,
    ownershipType: "SHARED" as const,
    splitType: "EQUAL" as const,
    userSharePercent: 50,
    partnerSharePercent: 50,
    partnerId: userB.id,
  };

  const parsedShared50 = createInstallmentSchema.safeParse(shared50Input);
  if (!parsedShared50.success) {
    throw new Error(`Shared 50/50 schema validation failed: ${JSON.stringify(parsedShared50.error)}`);
  }

  const shared50Inst = await InstallmentService.createInstallment(userA.id, parsedShared50.data);
  const dbShared50 = await prisma.installment.findUniqueOrThrow({
    where: { id: shared50Inst.id },
    include: { payments: { include: { splits: true } } },
  });

  if (dbShared50.partnerId !== userB.id) throw new Error("PartnerId mismatch");
  if (dbShared50.ownershipType !== "SHARED") throw new Error("Expected SHARED ownership");
  for (const p of dbShared50.payments) {
    if (new Prisma.Decimal(p.amount).toNumber() !== 2000) throw new Error("Payment mismatch");
    if (p.splits.length !== 2) throw new Error("Expected 2 splits per payment");
    const uSplit = p.splits.find((s) => s.userId === userA.id);
    const pSplit = p.splits.find((s) => s.userId === userB.id);
    if (!uSplit || new Prisma.Decimal(uSplit.amount).toNumber() !== 1000) throw new Error("User A split mismatch");
    if (!pSplit || new Prisma.Decimal(pSplit.amount).toNumber() !== 1000) throw new Error("User B split mismatch");
  }
  console.log("  ✅ PASS: Shared 50/50 installment correctly creates equal ฿1,000 splits for each user");

  console.log("\n▶️ TEST C2: Shared Custom 70/30 Installment (฿15,000 / 10 months)");
  const shared70Input = {
    name: "[UX3-TEST] Shared 70/30 Washing Machine",
    providerId: provider.id,
    totalAmount: 15000,
    downPayment: 0,
    totalInstallments: 10,
    startDate: "2026-11-20",
    dueDay: 20,
    ownershipType: "SHARED" as const,
    splitType: "PERCENTAGE" as const,
    userSharePercent: 70,
    partnerSharePercent: 30,
    partnerId: userB.id,
  };

  const parsedShared70 = createInstallmentSchema.safeParse(shared70Input);
  if (!parsedShared70.success) {
    throw new Error(`Shared 70/30 schema validation failed: ${JSON.stringify(parsedShared70.error)}`);
  }

  const shared70Inst = await InstallmentService.createInstallment(userA.id, parsedShared70.data);
  const dbShared70 = await prisma.installment.findUniqueOrThrow({
    where: { id: shared70Inst.id },
    include: { payments: { include: { splits: true } } },
  });

  for (const p of dbShared70.payments) {
    if (new Prisma.Decimal(p.amount).toNumber() !== 1500) throw new Error("Payment mismatch");
    const uSplit = p.splits.find((s) => s.userId === userA.id);
    const pSplit = p.splits.find((s) => s.userId === userB.id);
    if (!uSplit || new Prisma.Decimal(uSplit.amount).toNumber() !== 1050) throw new Error("User A 70% mismatch");
    if (!pSplit || new Prisma.Decimal(pSplit.amount).toNumber() !== 450) throw new Error("User B 30% mismatch");
  }
  console.log("  ✅ PASS: Shared 70/30 installment correctly creates ฿1,050 (70%) and ฿450 (30%) splits");

  // -------------------------------------------------------------
  // TEST D: Validation Tests (Rejection of invalid inputs)
  // -------------------------------------------------------------
  console.log("\n▶️ TEST D: Validation Rules Testing");

  // D1: Missing name
  const val1 = createInstallmentSchema.safeParse({ ...basicInput, name: " " });
  if (val1.success) throw new Error("Expected validation error for empty name");
  console.log("  ✅ PASS: Rejected empty name");

  // D2: Negative amount
  const val2 = createInstallmentSchema.safeParse({ ...basicInput, totalAmount: -100 });
  if (val2.success) throw new Error("Expected validation error for negative amount");
  console.log("  ✅ PASS: Rejected negative amount");

  // D3: Down payment >= total amount
  const val3 = createInstallmentSchema.safeParse({ ...basicInput, totalAmount: 5000, downPayment: 5000 });
  if (val3.success) throw new Error("Expected validation error for downPayment >= totalAmount");
  console.log("  ✅ PASS: Rejected downPayment >= totalAmount");

  // D4: Invalid installments (0 or > 120)
  const val4 = createInstallmentSchema.safeParse({ ...basicInput, totalInstallments: 0 });
  const val5 = createInstallmentSchema.safeParse({ ...basicInput, totalInstallments: 121 });
  if (val4.success || val5.success) throw new Error("Expected validation error for out-of-range totalInstallments");
  console.log("  ✅ PASS: Rejected totalInstallments = 0 and 121");

  // D5: Invalid split sum != 100%
  const val6 = createInstallmentSchema.safeParse({
    ...shared70Input,
    userSharePercent: 60,
    partnerSharePercent: 30, // sum 90%
  });
  if (val6.success) throw new Error("Expected validation error for split sum != 100%");
  console.log("  ✅ PASS: Rejected shared split percentages summing to 90%");

  // -------------------------------------------------------------
  // Cleanup test data
  // -------------------------------------------------------------
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[UX3-TEST]" } },
  });
  console.log("  🧹 Test data cleaned up successfully");

  console.log("\n=======================================================");
  console.log("🎉 ALL PHASE UX-3 FORM CREATION & DATA TESTS PASSED!");
  console.log("=======================================================\n");
}

runUX3Tests()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
