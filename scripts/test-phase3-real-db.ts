/**
 * Phase 3.5 Real Database Integration Verification Suite
 * Executes end-to-end tests against real PostgreSQL database.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { InstallmentService } from "../src/services/installment.service";

const prisma = new PrismaClient();

async function runRealDatabaseTests() {
  console.log("\n=======================================================");
  console.log("🐘 RUNNING PHASE 3.5 REAL POSTGRESQL INTEGRATION TESTS");
  console.log("=======================================================\n");

  const userA = await prisma.user.findFirstOrThrow({ where: { email: "usera@example.com" } });
  const userB = await prisma.user.findFirstOrThrow({ where: { email: "userb@example.com" } });
  const provider = await prisma.provider.findFirstOrThrow({ where: { slug: "shopee" } });
  const category = await prisma.category.findFirstOrThrow({ where: { slug: "shopping" } });

  console.log(`👤 Using test users: User A (${userA.id}), User B (${userB.id})`);

  // Clean up any previous test items
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[REAL-TEST]" } },
  });

  // -------------------------------------------------------------------------
  // TEST 1 — PERSONAL INSTALLMENT
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 1 — REAL DB: Create Personal Installment (Shopee ฿6,000 / 6)");
  const personalInst = await InstallmentService.createInstallment(userA.id, {
    name: "[REAL-TEST] Personal Shopee 6k",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 6000,
    downPayment: 0,
    totalInstallments: 6,
    startDate: "2027-01-01",
    dueDay: 5,
    ownershipType: "PERSONAL",
    splitType: "NONE",
    userSharePercent: 100,
    partnerSharePercent: 0,
  });

  // Verify in PostgreSQL
  const dbPersonal = await prisma.installment.findUniqueOrThrow({
    where: { id: personalInst.id },
    include: { payments: { include: { splits: true } } },
  });

  if (dbPersonal.ownershipType !== "PERSONAL") throw new Error("Expected ownershipType PERSONAL");
  if (dbPersonal.partnerId !== null) throw new Error("Expected partnerId to be null");
  if (dbPersonal.payments.length !== 6) throw new Error(`Expected 6 payments, got ${dbPersonal.payments.length}`);
  
  for (const p of dbPersonal.payments) {
    if (new Prisma.Decimal(p.amount).toNumber() !== 1000) {
      throw new Error(`Expected payment amount 1000, got ${p.amount}`);
    }
    if (p.splits.length !== 0) {
      throw new Error(`Expected 0 payment splits for personal, got ${p.splits.length}`);
    }
  }
  console.log("  ✅ PASS: 1 Installment, 6 Payments of ฿1,000.00, 0 Splits created in PostgreSQL");

  // -------------------------------------------------------------------------
  // TEST 2 — SHARED 50/50
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 2 — REAL DB: Create Shared 50/50 Installment (iPad ฿20,000 / 10)");
  const shared50 = await InstallmentService.createInstallment(userA.id, {
    name: "[REAL-TEST] Shared iPad 20k",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 20000,
    downPayment: 0,
    totalInstallments: 10,
    startDate: "2027-01-01",
    dueDay: 15,
    ownershipType: "SHARED",
    partnerId: userB.id,
    splitType: "EQUAL",
    userSharePercent: 50,
    partnerSharePercent: 50,
  });

  const dbShared50 = await prisma.installment.findUniqueOrThrow({
    where: { id: shared50.id },
    include: { payments: { include: { splits: true } } },
  });

  if (dbShared50.payments.length !== 10) throw new Error(`Expected 10 payments, got ${dbShared50.payments.length}`);
  const totalSplits50 = dbShared50.payments.flatMap((p) => p.splits);
  if (totalSplits50.length !== 20) throw new Error(`Expected 20 splits, got ${totalSplits50.length}`);

  for (const p of dbShared50.payments) {
    if (new Prisma.Decimal(p.amount).toNumber() !== 2000) {
      throw new Error(`Expected payment amount 2000, got ${p.amount}`);
    }
    if (p.splits.length !== 2) throw new Error(`Expected 2 splits per payment, got ${p.splits.length}`);

    const sA = p.splits.find((s) => s.userId === userA.id);
    const sB = p.splits.find((s) => s.userId === userB.id);
    if (!sA || !sB) throw new Error("Missing split for User A or User B");
    if (new Prisma.Decimal(sA.amount).toNumber() !== 1000 || new Prisma.Decimal(sB.amount).toNumber() !== 1000) {
      throw new Error(`Expected 1000 / 1000 split, got ${sA.amount} / ${sB.amount}`);
    }
    if (Number(sA.percentage) !== 50 || Number(sB.percentage) !== 50) {
      throw new Error(`Expected 50% / 50%, got ${sA.percentage}% / ${sB.percentage}%`);
    }
  }
  console.log("  ✅ PASS: 1 Installment, 10 Payments of ฿2,000.00, 20 Splits (฿1,000/฿1,000) verified in PostgreSQL");

  // -------------------------------------------------------------------------
  // TEST 3 — SHARED 70/30
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 3 — REAL DB: Create Shared 70/30 Installment (Washing Machine ฿15,000 / 10)");
  const shared70 = await InstallmentService.createInstallment(userA.id, {
    name: "[REAL-TEST] Washing Machine 15k",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 15000,
    downPayment: 0,
    totalInstallments: 10,
    startDate: "2027-01-01",
    dueDay: 20,
    ownershipType: "SHARED",
    partnerId: userB.id,
    splitType: "PERCENTAGE",
    userSharePercent: 70,
    partnerSharePercent: 30,
  });

  const dbShared70 = await prisma.installment.findUniqueOrThrow({
    where: { id: shared70.id },
    include: { payments: { include: { splits: true } } },
  });

  for (const p of dbShared70.payments) {
    if (new Prisma.Decimal(p.amount).toNumber() !== 1500) {
      throw new Error(`Expected payment amount 1500, got ${p.amount}`);
    }
    const sA = p.splits.find((s) => s.userId === userA.id);
    const sB = p.splits.find((s) => s.userId === userB.id);
    if (!sA || !sB) throw new Error("Missing split for User A or User B");
    if (new Prisma.Decimal(sA.amount).toNumber() !== 1050 || new Prisma.Decimal(sB.amount).toNumber() !== 450) {
      throw new Error(`Expected 1050 / 450 split, got ${sA.amount} / ${sB.amount}`);
    }
    if (Number(sA.percentage) !== 70 || Number(sB.percentage) !== 30) {
      throw new Error(`Expected 70% / 30%, got ${sA.percentage}% / ${sB.percentage}%`);
    }
  }
  console.log("  ✅ PASS: 10 Payments of ฿1,500.00, Splits: Owner ฿1,050 (70%), Partner ฿450 (30%) verified in PostgreSQL");

  // -------------------------------------------------------------------------
  // TEST 4 — EDIT
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 4 — REAL DB: Edit Installment with no paid history");
  const updatedPersonal = await InstallmentService.updateInstallment(personalInst.id, userA.id, {
    id: personalInst.id,
    name: "[REAL-TEST] Personal Shopee 6k (Renamed)",
    description: "Updated description via real DB",
    note: "Updated note",
  });
  if (updatedPersonal.name !== "[REAL-TEST] Personal Shopee 6k (Renamed)") {
    throw new Error("Update name failed in database");
  }
  console.log("  ✅ PASS: Successfully updated installment name and fields in PostgreSQL");

  // -------------------------------------------------------------------------
  // TEST 5 — DELETE
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 5 — REAL DB: Delete Installment with no paid history");
  const tempInst = await InstallmentService.createInstallment(userA.id, {
    name: "[REAL-TEST] Temp to delete",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 1000,
    downPayment: 0,
    totalInstallments: 2,
    startDate: "2027-01-01",
    dueDay: 1,
    ownershipType: "PERSONAL",
    splitType: "NONE",
    userSharePercent: 100,
    partnerSharePercent: 0,
  });
  await InstallmentService.deleteInstallment(tempInst.id, userA.id);
  const deletedCheck = await prisma.installment.findUnique({ where: { id: tempInst.id } });
  if (deletedCheck !== null) throw new Error("Expected installment to be deleted");
  console.log("  ✅ PASS: Successfully deleted installment and cascaded payments from PostgreSQL");

  // -------------------------------------------------------------------------
  // TEST 6 — REAL PAYMENT FLOW (Mark as Paid & Revert)
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 6 — REAL DB: Payment Flow (Mark as Paid & Revert)");
  const targetPayment = dbShared50.payments[0];

  // 1. Mark as Paid
  const paidResult = await InstallmentService.markPaymentAsPaid(targetPayment.id, userA.id);
  if (paidResult.status !== "PAID" || !paidResult.paidAt) {
    throw new Error("Expected payment to be PAID with paidAt timestamp");
  }

  // Verify in PostgreSQL
  const dbPaidCheck = await prisma.installmentPayment.findUniqueOrThrow({
    where: { id: targetPayment.id },
    include: { splits: true },
  });
  if (dbPaidCheck.status !== "PAID" || !dbPaidCheck.paidAt) {
    throw new Error("PostgreSQL record is not marked as PAID");
  }
  for (const s of dbPaidCheck.splits) {
    if (s.status !== "PAID" || !s.paidAt) {
      throw new Error(`Split ${s.id} not marked as PAID in PostgreSQL`);
    }
  }
  console.log("  ✅ PASS: Mark as Paid atomically updated InstallmentPayment and all PaymentSplits in PostgreSQL");

  // 2. Verify Delete Blocked when Paid History Exists
  console.log("  Verifying Delete is strictly blocked when paid history exists...");
  let deleteBlocked = false;
  try {
    await InstallmentService.deleteInstallment(dbShared50.id, userA.id);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("ไม่สามารถลบรายการนี้ได้ เนื่องจากมีประวัติการชำระเงินแล้ว")) {
      deleteBlocked = true;
    }
  }
  if (!deleteBlocked) throw new Error("Expected deletion to be blocked when paid history exists!");
  console.log("  ✅ PASS: Deletion strictly blocked because paid payment history exists in PostgreSQL");

  // 3. Revert Payment
  console.log("  Reverting payment back to unpaid...");
  const revertedResult = await InstallmentService.revertPaymentPaid(targetPayment.id, userA.id);
  if (revertedResult.status === "PAID" || revertedResult.paidAt !== null) {
    throw new Error("Expected payment to no longer be PAID");
  }

  const dbRevertedCheck = await prisma.installmentPayment.findUniqueOrThrow({
    where: { id: targetPayment.id },
    include: { splits: true },
  });
  if (dbRevertedCheck.status === "PAID" || dbRevertedCheck.paidAt !== null) {
    throw new Error("PostgreSQL record still marked as PAID after revert");
  }
  for (const s of dbRevertedCheck.splits) {
    if (s.status === "PAID" || s.paidAt !== null) {
      throw new Error(`Split ${s.id} still marked as PAID after revert in PostgreSQL`);
    }
  }
  console.log("  ✅ PASS: Revert Payment atomically reset payment status and splits in PostgreSQL");

  // -------------------------------------------------------------------------
  // TEST 7 — AUTHORIZATION
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 7 — REAL DB: Server-Side Authorization Rules");

  // 1. Partner can read shared installment
  const partnerView = await InstallmentService.getInstallmentById(dbShared50.id, userB.id);
  if (!partnerView) throw new Error("Partner should be allowed to view shared installment");
  console.log("  ✅ PASS: Partner allowed to read shared installment");

  // 2. Partner cannot mutate/edit owner's installment
  let partnerEditBlocked = false;
  try {
    await InstallmentService.updateInstallment(dbShared50.id, userB.id, {
      id: dbShared50.id,
      name: "[HACK] Unauthorized Edit",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("เฉพาะเจ้าของรายการเท่านั้น")) {
      partnerEditBlocked = true;
    }
  }
  if (!partnerEditBlocked) throw new Error("Partner was able to edit owner's installment!");
  console.log("  ✅ PASS: Partner rejected from editing owner's installment");

  // 3. Partner cannot delete owner's shared installment
  let partnerDeleteBlocked = false;
  try {
    await InstallmentService.deleteInstallment(dbShared50.id, userB.id);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("เฉพาะเจ้าของรายการเท่านั้น")) {
      partnerDeleteBlocked = true;
    }
  }
  if (!partnerDeleteBlocked) throw new Error("Partner was able to delete owner's installment!");
  console.log("  ✅ PASS: Partner rejected from deleting owner's installment");

  // 4. User B cannot read User A's personal installment
  let userBReadBlocked = false;
  try {
    await InstallmentService.getInstallmentById(personalInst.id, userB.id);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes("Forbidden") || err.message.includes("permission"))) {
      userBReadBlocked = true;
    }
  }
  if (!userBReadBlocked) throw new Error("User B was able to view User A's personal installment!");
  console.log("  ✅ PASS: User B blocked from viewing User A's private personal installment");

  // Clean up test data
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[REAL-TEST]" } },
  });
  console.log("  🧹 Test data cleaned up successfully");

  console.log("\n=======================================================");
  console.log("🎉 ALL PHASE 3.5 REAL POSTGRESQL INTEGRATION TESTS PASSED!");
  console.log("=======================================================\n");
}

runRealDatabaseTests()
  .catch((err) => {
    console.error("❌ INTEGRATION TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
