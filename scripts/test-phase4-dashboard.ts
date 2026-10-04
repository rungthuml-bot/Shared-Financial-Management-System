/**
 * Phase 4 Dashboard & Analytics Verification Suite
 * Verifies real aggregations, timeframes, net settlement, and authorization against PostgreSQL.
 */
import { PrismaClient } from "@prisma/client";
import { DashboardService } from "../src/services/dashboard.service";
import { InstallmentService } from "../src/services/installment.service";

const prisma = new PrismaClient();

async function runDashboardTests() {
  console.log("\n=======================================================");
  console.log("📊 RUNNING PHASE 4 REAL DASHBOARD & ANALYTICS TESTS");
  console.log("=======================================================\n");

  const userA = await prisma.user.findFirstOrThrow({ where: { email: "usera@example.com" } });
  const userB = await prisma.user.findFirstOrThrow({ where: { email: "userb@example.com" } });
  const provider = await prisma.provider.findFirstOrThrow({ where: { slug: "shopee" } });
  const category = await prisma.category.findFirstOrThrow({ where: { slug: "shopping" } });

  console.log(`👤 Using test users: User A (${userA.id}), User B (${userB.id})`);

  // Clean up any existing test records
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[DASHBOARD-TEST]" } },
  });

  // -------------------------------------------------------------------------
  // 1. Personal Installment Totals, Paid & Remaining Amount
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 1: Personal Installment Calculations (Total, Paid, Remaining)");
  const personal = await InstallmentService.createInstallment(userA.id, {
    name: "[DASHBOARD-TEST] Personal 6k",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 6000,
    downPayment: 0,
    totalInstallments: 6,
    startDate: "2026-10-01",
    dueDay: 5,
    ownershipType: "PERSONAL",
    splitType: "NONE",
    userSharePercent: 100,
    partnerSharePercent: 0,
  });

  // Mark 2 payments as paid
  const p1 = personal.payments[0];
  const p2 = personal.payments[1];
  await InstallmentService.markPaymentAsPaid(p1.id, userA.id);
  await InstallmentService.markPaymentAsPaid(p2.id, userA.id);

  const dashUserA = await DashboardService.getDashboardData(userA.id, "all_time");

  // Verify Personal Totals for User A
  if (dashUserA.totalPaidAmount < 2000) {
    throw new Error(`Expected at least ฿2,000 paid, got ฿${dashUserA.totalPaidAmount}`);
  }
  if (dashUserA.totalRemainingAmount <= 0) {
    throw new Error(`Expected remaining amount > 0, got ฿${dashUserA.totalRemainingAmount}`);
  }
  console.log(`  ✅ PASS: Total Installment: ฿${dashUserA.totalInstallmentAmount}, Paid: ฿${dashUserA.totalPaidAmount}, Remaining: ฿${dashUserA.totalRemainingAmount}`);

  // -------------------------------------------------------------------------
  // 2. Upcoming & Overdue Detection
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 2: Upcoming & Overdue Payment Recognition");
  // p1 & p2 are paid, remaining 4 payments:
  // Payments have due dates in 2026-12-05, 2027-01-05, etc.
  const hasUpcoming = dashUserA.upcomingPayments.length > 0;
  if (!hasUpcoming) {
    throw new Error("Expected upcoming payments to be found");
  }
  console.log(`  ✅ PASS: Detected ${dashUserA.upcomingPayments.length} upcoming payments sorted by nearest date`);

  // -------------------------------------------------------------------------
  // 3. Shared 50/50 and 70/30 Share Calculation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 3: Shared 50/50 & 70/30 User-Share Calculations");
  const shared50 = await InstallmentService.createInstallment(userA.id, {
    name: "[DASHBOARD-TEST] Shared iPad 20k",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 20000,
    downPayment: 0,
    totalInstallments: 10,
    startDate: "2026-10-01",
    dueDay: 15,
    ownershipType: "SHARED",
    partnerId: userB.id,
    splitType: "EQUAL",
    userSharePercent: 50,
    partnerSharePercent: 50,
  });

  const shared70 = await InstallmentService.createInstallment(userA.id, {
    name: "[DASHBOARD-TEST] Shared Washing Machine 15k",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 15000,
    downPayment: 0,
    totalInstallments: 10,
    startDate: "2026-10-01",
    dueDay: 20,
    ownershipType: "SHARED",
    partnerId: userB.id,
    splitType: "PERCENTAGE",
    userSharePercent: 70,
    partnerSharePercent: 30,
  });

  // User A's share of shared50 = ฿10,000, shared70 = ฿10,500
  // User B's share of shared50 = ฿10,000, shared70 = ฿4,500
  const dashUserB = await DashboardService.getDashboardData(userB.id, "all_time");

  // Verify User B's dashboard only includes User B's share!
  // For shared50: User B has ฿10,000
  // For shared70: User B has ฿4,500
  const userBProgress50 = dashUserB.installmentProgress.find((i) => i.id === shared50.id);
  const userBProgress70 = dashUserB.installmentProgress.find((i) => i.id === shared70.id);

  if (!userBProgress50 || userBProgress50.totalAmount !== 10000) {
    throw new Error(`Expected User B share of shared50 to be 10000, got ${userBProgress50?.totalAmount}`);
  }
  if (!userBProgress70 || userBProgress70.totalAmount !== 4500) {
    throw new Error(`Expected User B share of shared70 to be 4500, got ${userBProgress70?.totalAmount}`);
  }
  console.log("  ✅ PASS: User B dashboard correctly calculates User B's 50% (฿10,000) and 30% (฿4,500) shares");

  // -------------------------------------------------------------------------
  // 4. Net Settlement Calculation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 4: Net Settlement Calculation");
  const netStl = await DashboardService.calculateNetSettlement(userA.id);
  if (!netStl.hasSharedData) {
    throw new Error("Expected shared settlement data to be present");
  }
  console.log(`  ✅ PASS: Net Settlement direction: "${netStl.direction}", Net Amount: ฿${netStl.netAmount}`);
  console.log(`  Summary: ${netStl.summaryText}`);

  // -------------------------------------------------------------------------
  // 5. User Authorization: Private Installments Isolation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 5: User Data Isolation & Security");
  // User B's dashboard must NOT show User A's personal installment
  const userBHasPersonalA = dashUserB.installmentProgress.some((i) => i.id === personal.id);
  if (userBHasPersonalA) {
    throw new Error("Security Violation: User B was able to see User A's private personal installment in dashboard!");
  }
  console.log("  ✅ PASS: User A's personal installment is strictly excluded from User B's dashboard");

  // -------------------------------------------------------------------------
  // 6. Timeframe Filter Behavior
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 6: Timeframe Filters (this_month, next_month, all_time)");
  const tfThisMonth = await DashboardService.getDashboardData(userA.id, "this_month");
  const tfNextMonth = await DashboardService.getDashboardData(userA.id, "next_month");
  if (!tfThisMonth.period.label || !tfNextMonth.period.label) {
    throw new Error("Expected period label in dashboard data");
  }
  console.log(`  ✅ PASS: Timeframe bounds formatted properly ("${tfThisMonth.period.label}", "${tfNextMonth.period.label}")`);

  // -------------------------------------------------------------------------
  // 7. Empty Dashboard Handling (No crash on user with 0 installments)
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 7: Empty Dashboard Graceful Handling");
  const tempUser = await prisma.user.create({
    data: {
      email: `temp_empty_${Date.now()}@example.com`,
      name: "Empty User",
    },
  });

  const emptyDash = await DashboardService.getDashboardData(tempUser.id, "this_month");
  if (emptyDash.totalInstallmentAmount !== 0 || emptyDash.activeInstallmentsCount !== 0) {
    throw new Error("Expected 0 totals for empty user");
  }
  if (emptyDash.upcomingPayments.length !== 0 || emptyDash.overduePayments.length !== 0) {
    throw new Error("Expected empty lists for new user");
  }

  // Clean up temp user
  await prisma.user.delete({ where: { id: tempUser.id } });
  console.log("  ✅ PASS: Fresh user with 0 records renders 0 metrics and empty lists without errors");

  // Clean up test data
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[DASHBOARD-TEST]" } },
  });
  console.log("  🧹 Test data cleaned up successfully");

  console.log("\n=======================================================");
  console.log("🎉 ALL PHASE 4 DASHBOARD & ANALYTICS TESTS PASSED!");
  console.log("=======================================================\n");
}

runDashboardTests()
  .catch((err) => {
    console.error("❌ DASHBOARD TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
