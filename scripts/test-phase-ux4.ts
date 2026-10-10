/**
 * Phase UX-4 — Dashboard Simplification & Information Hierarchy Test Suite
 * Validates:
 * 1. Financial summary KPIs (Remaining, Overdue, Paid in period, Active counts)
 * 2. Overdue detection and upcoming payments ordering
 * 3. Personal vs Shared responsibilities and Net Settlement isolation
 * 4. Timeframe filter behavior (this_month, next_month, last_3_months, all_time)
 * 5. Monthly trend aggregation integrity
 * 6. Zero/Empty user state without errors or misleading figures
 */
import { PrismaClient } from "@prisma/client";
import { DashboardService } from "../src/services/dashboard.service";
import { InstallmentService } from "../src/services/installment.service";

const prisma = new PrismaClient();

async function runPhaseUX4Tests() {
  console.log("\n=======================================================");
  console.log("📊 RUNNING PHASE UX-4 DASHBOARD SIMPLIFICATION TESTS");
  console.log("=======================================================\n");

  const userA = await prisma.user.findFirstOrThrow({ where: { email: "usera@example.com" } });
  const userB = await prisma.user.findFirstOrThrow({ where: { email: "userb@example.com" } });
  const provider = await prisma.provider.findFirstOrThrow({ where: { slug: "shopee" } });
  const category = await prisma.category.findFirstOrThrow({ where: { slug: "shopping" } });

  console.log(`👤 Test Context: User A (${userA.email}), Partner User B (${userB.email})`);

  // Clean up any existing UX-4 test artifacts
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[UX4-TEST]" } },
  });

  // -------------------------------------------------------------------------
  // Test 1: Financial Summary KPIs (Section B)
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 1: Essential Financial Summary KPIs");
  const testInst = await InstallmentService.createInstallment(userA.id, {
    name: "[UX4-TEST] Personal Mac 48k",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 48000,
    downPayment: 12000,
    totalInstallments: 6,
    startDate: "2026-10-01",
    dueDay: 10,
    ownershipType: "PERSONAL",
    splitType: "NONE",
    userSharePercent: 100,
    partnerSharePercent: 0,
  });

  // Mark 1 payment as paid
  const firstPayment = testInst.payments[0];
  await InstallmentService.markPaymentAsPaid(firstPayment.id, userA.id);

  const dashThisMonth = await DashboardService.getDashboardData(userA.id, "this_month");

  // Validate KPI 1: Remaining amount (totalAmount 48000 - downPayment 12000 - paid 6000 = 30000)
  if (dashThisMonth.totalRemainingAmount <= 0) {
    throw new Error(`Expected remaining amount > 0, got ${dashThisMonth.totalRemainingAmount}`);
  }

  // Validate KPI 2: Overdue amount
  if (typeof dashThisMonth.totalOverdueAmount !== "number") {
    throw new Error("Expected totalOverdueAmount to be a valid number");
  }

  // Validate KPI 3: Paid in current period
  if (dashThisMonth.period.paidAmount < 6000) {
    throw new Error(`Expected period paid amount to be at least 6000, got ${dashThisMonth.period.paidAmount}`);
  }

  // Validate KPI 4: Active count
  if (dashThisMonth.activeInstallmentsCount < 1) {
    throw new Error(`Expected activeInstallmentsCount >= 1, got ${dashThisMonth.activeInstallmentsCount}`);
  }
  if (dashThisMonth.personalInstallmentsCount < 1) {
    throw new Error(`Expected personalInstallmentsCount >= 1, got ${dashThisMonth.personalInstallmentsCount}`);
  }

  console.log(`  ✅ KPI 1 ยอดคงเหลือ: ฿${dashThisMonth.totalRemainingAmount.toLocaleString()}`);
  console.log(`  ✅ KPI 2 ยอดค้างชำระ: ฿${dashThisMonth.totalOverdueAmount.toLocaleString()}`);
  console.log(`  ✅ KPI 3 ยอดที่ชำระแล้ว: ฿${dashThisMonth.period.paidAmount.toLocaleString()} (${dashThisMonth.period.paidPercentage}%)`);
  console.log(`  ✅ KPI 4 สัญญาที่กำลังผ่อน: ${dashThisMonth.activeInstallmentsCount} (ส่วนตัว: ${dashThisMonth.personalInstallmentsCount}, ผ่อนร่วม: ${dashThisMonth.sharedInstallmentsCount})`);

  // -------------------------------------------------------------------------
  // Test 2: Upcoming and Overdue Payments (Section C)
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 2: Upcoming & Overdue Payments List Ordering & Integrity");
  // Upcoming payments must NOT include paid payments
  const hasPaidInUpcoming = dashThisMonth.upcomingPayments.some((p) => p.id === firstPayment.id);
  if (hasPaidInUpcoming) {
    throw new Error("Assertion failed: Paid payment appeared in upcoming payments list!");
  }

  // Verify upcoming payments ordering by dueDate ascending
  for (let i = 0; i < dashThisMonth.upcomingPayments.length - 1; i++) {
    const cur = new Date(dashThisMonth.upcomingPayments[i].dueDate).getTime();
    const next = new Date(dashThisMonth.upcomingPayments[i + 1].dueDate).getTime();
    if (cur > next) {
      throw new Error(`Upcoming payments not sorted ascending: index ${i} is after index ${i + 1}`);
    }
  }
  console.log(`  ✅ Upcoming payments count: ${dashThisMonth.upcomingPayments.length}, correctly ordered by due date ascending`);
  console.log(`  ✅ Paid payments are strictly excluded from upcoming list`);

  // -------------------------------------------------------------------------
  // Test 3: Personal & Shared Responsibilities and Net Settlement (Section D)
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 3: Personal & Shared Overview and Net Settlement");
  const sharedInst = await InstallmentService.createInstallment(userA.id, {
    name: "[UX4-TEST] Shared iPhone 30k",
    providerId: provider.id,
    categoryId: category.id,
    totalAmount: 30000,
    downPayment: 0,
    totalInstallments: 10,
    startDate: "2026-10-01",
    dueDay: 25,
    ownershipType: "SHARED",
    partnerId: userB.id,
    splitType: "PERCENTAGE",
    userSharePercent: 60,
    partnerSharePercent: 40,
  });

  const dashUserB = await DashboardService.getDashboardData(userB.id, "all_time");

  // User B's share of sharedInst is 40% of 30,000 = 12,000
  const progressB = dashUserB.installmentProgress.find((p) => p.id === sharedInst.id);
  if (!progressB || progressB.totalAmount !== 12000) {
    throw new Error(`Expected User B share to be ฿12,000, got ${progressB?.totalAmount}`);
  }
  console.log(`  ✅ User B's share of ฿30,000 (40%) correctly calculated as: ฿${progressB.totalAmount.toLocaleString()}`);

  // User B must NOT see User A's private personal installment
  const userBSeesPersonal = dashUserB.installmentProgress.some((p) => p.id === testInst.id);
  if (userBSeesPersonal) {
    throw new Error("Data isolation breach: User B can see User A's personal installment!");
  }
  console.log("  ✅ Data isolation verified: User A's personal installment is hidden from User B");

  // Net settlement summary
  const netSettlement = await DashboardService.calculateNetSettlement(userA.id);
  if (!netSettlement.hasSharedData) {
    throw new Error("Expected hasSharedData to be true after creating shared installment");
  }
  console.log(`  ✅ Net Settlement direction: "${netSettlement.direction}"`);
  console.log(`  ✅ Summary text: "${netSettlement.summaryText}"`);
  console.log(`  ✅ Breakdown text: "${netSettlement.breakdownText}"`);

  // -------------------------------------------------------------------------
  // Test 4: Timeframe Filter Queries (Section 5)
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 4: Timeframe Filter Switching");
  const timeframes = ["this_month", "next_month", "last_3_months", "all_time"] as const;
  for (const tf of timeframes) {
    const res = await DashboardService.getDashboardData(userA.id, tf);
    if (!res.period.label || typeof res.period.paidAmount !== "number") {
      throw new Error(`Failed to query timeframe ${tf}`);
    }
    console.log(`  ✅ Timeframe "${tf}" -> Period Label: "${res.period.label}", Paid: ฿${res.period.paidAmount.toLocaleString()}`);
  }

  // -------------------------------------------------------------------------
  // Test 5: Monthly Trend Aggregation (Section E)
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 5: Monthly Trend Chart Data Aggregation");
  const dashTrend = await DashboardService.getDashboardData(userA.id, "all_time");
  if (!Array.isArray(dashTrend.monthlyTrend) || dashTrend.monthlyTrend.length === 0) {
    throw new Error("Expected monthlyTrend array with at least 1 month");
  }
  const trendTotal = dashTrend.monthlyTrend.reduce((sum, m) => sum + m.total, 0);
  if (trendTotal <= 0) {
    throw new Error("Expected monthlyTrend total across months to be > 0");
  }
  console.log(`  ✅ Monthly trend contains ${dashTrend.monthlyTrend.length} months of data, sum = ฿${trendTotal.toLocaleString()}`);

  // -------------------------------------------------------------------------
  // Test 6: Empty User State Handling
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 6: Graceful Handling for New User (0 Installments)");
  const freshUser = await prisma.user.create({
    data: {
      email: `test_ux4_empty_${Date.now()}@example.com`,
      name: "Empty UX4 Tester",
    },
  });

  const emptyDash = await DashboardService.getDashboardData(freshUser.id, "this_month");
  if (emptyDash.totalInstallmentAmount !== 0 || emptyDash.totalRemainingAmount !== 0 || emptyDash.totalOverdueAmount !== 0) {
    throw new Error("Expected zero totals for empty user");
  }
  if (emptyDash.upcomingPayments.length !== 0 || emptyDash.overduePayments.length !== 0) {
    throw new Error("Expected zero upcoming/overdue payments for empty user");
  }
  if (emptyDash.netSettlement.hasSharedData !== false) {
    throw new Error("Expected hasSharedData to be false for empty user");
  }

  await prisma.user.delete({ where: { id: freshUser.id } });
  console.log("  ✅ Empty user returns clean zero/empty state without errors");

  // Clean up test data
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[UX4-TEST]" } },
  });
  console.log("  🧹 Test data cleaned up successfully");

  console.log("\n=======================================================");
  console.log("🎉 ALL PHASE UX-4 TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runPhaseUX4Tests()
  .catch((err) => {
    console.error("❌ PHASE UX-4 TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
