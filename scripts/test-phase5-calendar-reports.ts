/**
 * Phase 5 Calendar, Reports & Export Verification Suite
 * Verifies real calendar data, advanced reports, filters, CSV generation,
 * settlement consistency, and authorization against PostgreSQL.
 */
import { PrismaClient } from "@prisma/client";
import { CalendarService } from "../src/services/calendar.service";
import { ReportService } from "../src/services/report.service";
import { DashboardService } from "../src/services/dashboard.service";
import { InstallmentService } from "../src/services/installment.service";
import { generateReportCSV } from "../src/lib/export-csv";

const prisma = new PrismaClient();

async function runPhase5Tests() {
  console.log("\n=======================================================");
  console.log("📅📊 RUNNING PHASE 5 CALENDAR, REPORTS & EXPORT TESTS");
  console.log("=======================================================\n");

  const userA = await prisma.user.findFirstOrThrow({ where: { email: "usera@example.com" } });
  const userB = await prisma.user.findFirstOrThrow({ where: { email: "userb@example.com" } });
  const shopee = await prisma.provider.findFirstOrThrow({ where: { slug: "shopee" } });
  const lazada = await prisma.provider.findFirstOrThrow({ where: { slug: "lazada" } });
  const shopping = await prisma.category.findFirstOrThrow({ where: { slug: "shopping" } });
  const electronics = await prisma.category.findFirstOrThrow({ where: { slug: "electronics" } });

  console.log(`👤 Using test users: User A (${userA.id}), User B (${userB.id})`);

  // Clean up any existing Phase 5 test records
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[PHASE5-TEST]" } },
  });

  // -------------------------------------------------------------------------
  // Setup Deterministic Test Data
  // -------------------------------------------------------------------------
  console.log("\n⚙️ Setting up deterministic test data...");

  // 1. User A Personal Installment (Shopee / Electronics)
  // Total: 6,000 | 3 installments of 2,000 each (Oct 10, Nov 10, Dec 10, 2026)
  const personalA = await InstallmentService.createInstallment(userA.id, {
    name: "[PHASE5-TEST] User A Personal Tablet",
    providerId: shopee.id,
    categoryId: electronics.id,
    totalAmount: 6000,
    downPayment: 0,
    totalInstallments: 3,
    startDate: "2026-10-01",
    dueDay: 10,
    ownershipType: "PERSONAL",
    splitType: "NONE",
    userSharePercent: 100,
    partnerSharePercent: 0,
  });

  // Mark 1st payment as PAID
  const personalPay1 = personalA.payments[0];
  await InstallmentService.markPaymentAsPaid(personalPay1.id, userA.id);

  // 2. User A Shared 50/50 Installment with User B (Lazada / Shopping)
  // Total: 10,000 | 2 installments of 5,000 each (Oct 20, Nov 20, 2026)
  // User A share = 2,500/payment | User B share = 2,500/payment
  await InstallmentService.createInstallment(userA.id, {
    name: "[PHASE5-TEST] Shared AB Living Furniture",
    providerId: lazada.id,
    categoryId: shopping.id,
    totalAmount: 10000,
    downPayment: 0,
    totalInstallments: 2,
    startDate: "2026-10-01",
    dueDay: 20,
    ownershipType: "SHARED",
    partnerId: userB.id,
    splitType: "EQUAL",
    userSharePercent: 50,
    partnerSharePercent: 50,
  });

  // 3. User B Private Personal Installment (User B ONLY)
  // Total: 4,000 | 1 installment of 4,000 (Oct 15, 2026)
  await InstallmentService.createInstallment(userB.id, {
    name: "[PHASE5-TEST] User B Private Watch",
    providerId: shopee.id,
    categoryId: shopping.id,
    totalAmount: 4000,
    downPayment: 0,
    totalInstallments: 1,
    startDate: "2026-10-01",
    dueDay: 15,
    ownershipType: "PERSONAL",
    splitType: "NONE",
    userSharePercent: 100,
    partnerSharePercent: 0,
  });

  // 4. Overdue Payment for User A (Start in Sept 2026, due day 2 -> overdue by Oct 2026)
  await InstallmentService.createInstallment(userA.id, {
    name: "[PHASE5-TEST] User A Overdue Utility",
    providerId: shopee.id,
    categoryId: shopping.id,
    totalAmount: 1500,
    downPayment: 0,
    totalInstallments: 1,
    startDate: "2026-09-01",
    dueDay: 2,
    ownershipType: "PERSONAL",
    splitType: "NONE",
    userSharePercent: 100,
    partnerSharePercent: 0,
  });

  console.log("  ✅ Test data created successfully");

  // -------------------------------------------------------------------------
  // 1. Calendar Payment Retrieval
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 1: Calendar Payment Retrieval");
  const calOctUserA = await CalendarService.getCalendarData(userA.id, {
    year: 2026,
    month: 10,
  });

  if (!calOctUserA || !Array.isArray(calOctUserA.days) || calOctUserA.days.length !== 31) {
    throw new Error(`Expected 31 days in October 2026, got ${calOctUserA?.days?.length}`);
  }
  if (calOctUserA.allEvents.length === 0) {
    throw new Error("Expected payments in October 2026 calendar, found 0");
  }
  console.log(`  ✅ PASS: Calendar retrieved ${calOctUserA.allEvents.length} events across 31 days for Oct 2026`);

  // -------------------------------------------------------------------------
  // 2. Personal Payment Visibility
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 2: Personal Payment Visibility");
  const hasUserAPersonal = calOctUserA.allEvents.some(
    (e) => e.title === "[PHASE5-TEST] User A Personal Tablet" && e.day === 10
  );
  if (!hasUserAPersonal) {
    throw new Error("User A's personal payment due on Oct 10 was not found in User A's calendar");
  }
  console.log("  ✅ PASS: Personal payment is clearly visible on due date (Oct 10)");

  // -------------------------------------------------------------------------
  // 3. Shared Payment Visibility
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 3: Shared Payment Visibility (Both Participants)");
  const userAHasShared = calOctUserA.allEvents.some(
    (e) => e.title === "[PHASE5-TEST] Shared AB Living Furniture" && e.day === 20
  );
  if (!userAHasShared) {
    throw new Error("User A cannot see shared payment in October calendar");
  }

  const calOctUserB = await CalendarService.getCalendarData(userB.id, {
    year: 2026,
    month: 10,
  });
  const userBHasShared = calOctUserB.allEvents.some(
    (e) => e.title === "[PHASE5-TEST] Shared AB Living Furniture" && e.day === 20
  );
  if (!userBHasShared) {
    throw new Error("User B cannot see shared payment in October calendar");
  }
  console.log("  ✅ PASS: Both User A and User B can view their shared payment on Oct 20");

  // -------------------------------------------------------------------------
  // 4. Unauthorized Data Isolation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 4: Unauthorized Data Isolation");
  const userASeesUserB = calOctUserA.allEvents.some(
    (e) => e.title === "[PHASE5-TEST] User B Private Watch"
  );
  if (userASeesUserB) {
    throw new Error("SECURITY VIOLATION: User A can see User B's private personal installment in calendar!");
  }

  const userBSeesUserA = calOctUserB.allEvents.some(
    (e) => e.title === "[PHASE5-TEST] User A Personal Tablet"
  );
  if (userBSeesUserA) {
    throw new Error("SECURITY VIOLATION: User B can see User A's private personal installment in calendar!");
  }
  console.log("  ✅ PASS: Strict isolation verified. No cross-tenant personal leakage in calendar");

  // -------------------------------------------------------------------------
  // 5. Status Filtering
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 5: Status Filtering");
  const calPaidOnly = await CalendarService.getCalendarData(userA.id, {
    year: 2026,
    month: 10,
    status: "PAID",
  });
  if (calPaidOnly.allEvents.some((e) => e.status !== "PAID")) {
    throw new Error("Status filter PAID returned non-PAID events");
  }
  const foundPaidEvent = calPaidOnly.allEvents.some(
    (e) => e.title === "[PHASE5-TEST] User A Personal Tablet" && e.status === "PAID"
  );
  if (!foundPaidEvent) {
    throw new Error("Expected to find User A's marked paid payment under PAID filter");
  }

  const calUpcomingOnly = await CalendarService.getCalendarData(userA.id, {
    year: 2026,
    month: 10,
    status: "UPCOMING",
  });
  if (calUpcomingOnly.allEvents.some((e) => e.status === "PAID")) {
    throw new Error("Status filter UPCOMING returned PAID events");
  }
  console.log("  ✅ PASS: Status filtering accurately separates PAID and UPCOMING events");

  // -------------------------------------------------------------------------
  // 6. Date Filtering
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 6: Date Filtering (Month & Custom Range)");
  const calNovUserA = await CalendarService.getCalendarData(userA.id, {
    year: 2026,
    month: 11,
  });
  const hasNovPayment = calNovUserA.allEvents.some(
    (e) => e.title === "[PHASE5-TEST] User A Personal Tablet" && e.day === 10
  );
  if (!hasNovPayment) {
    throw new Error("November payment #2 not found in November calendar view");
  }

  // Report custom date range: 2026-10-01 to 2026-10-31
  const reportOct = await ReportService.getReportData(userA.id, {
    period: "custom",
    customStartDate: "2026-10-01",
    customEndDate: "2026-10-31",
  });
  const hasOutOfRange = reportOct.tableRows.some(
    (r) => r.dueDate < "2026-10-01" || r.dueDate > "2026-10-31"
  );
  if (hasOutOfRange) {
    throw new Error("Report custom date range returned items outside requested boundaries");
  }
  console.log(`  ✅ PASS: Date boundaries correctly isolated (${reportOct.tableRows.length} items in Oct 2026)`);

  // -------------------------------------------------------------------------
  // 7. Provider Filtering
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 7: Provider Filtering");
  const reportShopee = await ReportService.getReportData(userA.id, {
    period: "all_time",
    providerId: shopee.id,
  });
  if (reportShopee.tableRows.some((r) => r.provider.name !== "Shopee")) {
    throw new Error("Provider filter Shopee returned non-Shopee items");
  }
  console.log(`  ✅ PASS: Provider filter correctly filtered ${reportShopee.tableRows.length} Shopee items`);

  // -------------------------------------------------------------------------
  // 8. Category Filtering
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 8: Category Filtering");
  const reportElectronics = await ReportService.getReportData(userA.id, {
    period: "all_time",
    categoryId: electronics.id,
  });
  if (reportElectronics.tableRows.some((r) => r.category?.slug !== "electronics")) {
    throw new Error("Category filter Electronics returned non-electronics items");
  }
  console.log(`  ✅ PASS: Category filter correctly filtered ${reportElectronics.tableRows.length} Electronics items`);

  // -------------------------------------------------------------------------
  // 9. Report Total Calculation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 9: Report Total Calculation");
  const reportAllA = await ReportService.getReportData(userA.id, { period: "all_time" });
  if (reportAllA.summary.totalInstallmentAmount <= 0) {
    throw new Error("Expected total installment amount > 0");
  }
  const calculatedSum = reportAllA.tableRows.reduce((acc, row) => acc + row.myShare, 0);
  if (Math.abs(reportAllA.summary.totalInstallmentAmount - calculatedSum) > 0.01) {
    throw new Error(
      `Summary total (${reportAllA.summary.totalInstallmentAmount}) does not match table sum (${calculatedSum})`
    );
  }
  console.log(`  ✅ PASS: Total Installment Amount accurately summed at ฿${reportAllA.summary.totalInstallmentAmount}`);

  // -------------------------------------------------------------------------
  // 10. Paid Amount Calculation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 10: Paid Amount Calculation");
  if (reportAllA.summary.totalPaidAmount < 2000) {
    throw new Error(`Expected at least ฿2,000 paid for User A, got ฿${reportAllA.summary.totalPaidAmount}`);
  }
  const paidRowsSum = reportAllA.tableRows
    .filter((r) => r.status === "PAID")
    .reduce((acc, r) => acc + r.myShare, 0);
  if (Math.abs(reportAllA.summary.totalPaidAmount - paidRowsSum) > 0.01) {
    throw new Error(`Paid amount mismatch: ${reportAllA.summary.totalPaidAmount} vs ${paidRowsSum}`);
  }
  console.log(`  ✅ PASS: Total Paid Amount verified at ฿${reportAllA.summary.totalPaidAmount}`);

  // -------------------------------------------------------------------------
  // 11. Remaining Amount Calculation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 11: Remaining Amount Calculation");
  const expectedRemaining = reportAllA.summary.totalInstallmentAmount - reportAllA.summary.totalPaidAmount;
  if (Math.abs(reportAllA.summary.totalRemainingAmount - expectedRemaining) > 0.01) {
    throw new Error(
      `Remaining amount mismatch: ${reportAllA.summary.totalRemainingAmount} vs expected ${expectedRemaining}`
    );
  }
  console.log(`  ✅ PASS: Total Remaining Amount verified at ฿${reportAllA.summary.totalRemainingAmount}`);

  // -------------------------------------------------------------------------
  // 12. Overdue Amount Calculation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 12: Overdue Amount Calculation");
  if (reportAllA.summary.totalOverdueAmount < 1500) {
    throw new Error(
      `Expected at least ฿1,500 overdue for User A, got ฿${reportAllA.summary.totalOverdueAmount}`
    );
  }
  console.log(`  ✅ PASS: Total Overdue Amount recognized at ฿${reportAllA.summary.totalOverdueAmount}`);

  // -------------------------------------------------------------------------
  // 13. Personal vs Shared Calculation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 13: Personal vs Shared User-Share Calculations");
  const { personal, shared } = reportAllA.personalVsShared;

  // Personal should include Tablet (6000) + Overdue Utility (1500) + any existing Phase 3/4 personal
  if (personal.totalAmount < 7500) {
    throw new Error(`Expected personal total >= 7500, got ${personal.totalAmount}`);
  }
  // Shared for User A should only include User A's 50% share of 10000 = 5000 (+ any existing Phase 4 shared)
  if (shared.totalAmount < 5000) {
    throw new Error(`Expected shared total >= 5000, got ${shared.totalAmount}`);
  }

  // Partner's share must NOT be in User A's total:
  const sharedRowAB = reportAllA.tableRows.find(
    (r) => r.installmentName === "[PHASE5-TEST] Shared AB Living Furniture"
  );
  if (sharedRowAB && sharedRowAB.myShare !== 2500) {
    throw new Error(`Expected User A's share per payment to be 2,500, got ${sharedRowAB.myShare}`);
  }
  console.log(`  ✅ PASS: Personal (฿${personal.totalAmount}) and Shared (฿${shared.totalAmount}) accurately scoped`);

  // -------------------------------------------------------------------------
  // 14. Provider Breakdown
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 14: Provider Breakdown");
  if (!Array.isArray(reportAllA.providerBreakdown) || reportAllA.providerBreakdown.length === 0) {
    throw new Error("Provider breakdown is empty");
  }
  const shopeeBreakdown = reportAllA.providerBreakdown.find((p) => p.name === "Shopee");
  if (!shopeeBreakdown || shopeeBreakdown.totalAmount <= 0) {
    throw new Error("Shopee breakdown missing or has 0 amount");
  }
  // Verify no 0-data providers
  if (reportAllA.providerBreakdown.some((p) => p.totalAmount === 0)) {
    throw new Error("Provider breakdown contains providers with 0 data");
  }
  console.log(`  ✅ PASS: ${reportAllA.providerBreakdown.length} active providers summarized with accurate metrics`);

  // -------------------------------------------------------------------------
  // 15. Category Breakdown
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 15: Category Breakdown");
  if (!Array.isArray(reportAllA.categoryBreakdown) || reportAllA.categoryBreakdown.length === 0) {
    throw new Error("Category breakdown is empty");
  }
  const elecCategory = reportAllA.categoryBreakdown.find((c) => c.slug === "electronics");
  if (!elecCategory || elecCategory.totalAmount <= 0) {
    throw new Error("Electronics category breakdown missing or has 0 amount");
  }
  const totalPercentage = reportAllA.categoryBreakdown.reduce((sum, c) => sum + c.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 1.0) {
    throw new Error(`Category breakdown percentages should sum to ~100%, got ${totalPercentage}%`);
  }
  console.log(`  ✅ PASS: Category breakdown percentages sum to ${totalPercentage.toFixed(1)}%`);

  // -------------------------------------------------------------------------
  // 16. CSV Data Generation
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 16: CSV Data Generation & UTF-8 BOM");
  const csvOutput = generateReportCSV(reportAllA.tableRows);

  if (!csvOutput.startsWith("\uFEFF")) {
    throw new Error("CSV does not begin with UTF-8 BOM (\\uFEFF) for Excel Thai compatibility");
  }
  if (!csvOutput.includes("วันที่ครบกำหนด") || !csvOutput.includes("ชื่อรายการผ่อน")) {
    throw new Error("CSV is missing required Thai headers");
  }
  if (!csvOutput.includes("[PHASE5-TEST] User A Personal Tablet")) {
    throw new Error("CSV missing expected installment row data");
  }
  console.log(`  ✅ PASS: CSV generated successfully (${csvOutput.length} chars) with valid BOM and Thai headers`);

  // -------------------------------------------------------------------------
  // 17. Settlement Report Consistency
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 17: Settlement Report Consistency");
  const directSettlement = await DashboardService.calculateNetSettlement(userA.id);
  if (
    reportAllA.netSettlement.netAmount !== directSettlement.netAmount ||
    reportAllA.netSettlement.amountOthersOweMe !== directSettlement.amountOthersOweMe ||
    reportAllA.netSettlement.amountIOweOthers !== directSettlement.amountIOweOthers
  ) {
    throw new Error("Report net settlement is inconsistent with DashboardService calculation");
  }
  console.log(`  ✅ PASS: Settlement is consistent (Net Amount: ฿${reportAllA.netSettlement.netAmount})`);

  // -------------------------------------------------------------------------
  // 18. Empty Data Handling
  // -------------------------------------------------------------------------
  console.log("\n▶️ TEST 18: Empty Data Handling (No records in range / Fresh user)");
  const emptyReport = await ReportService.getReportData(userA.id, {
    period: "custom",
    customStartDate: "2099-01-01",
    customEndDate: "2099-01-31",
  });

  if (
    emptyReport.summary.totalInstallmentAmount !== 0 ||
    emptyReport.summary.totalPaidAmount !== 0 ||
    emptyReport.tableRows.length !== 0 ||
    emptyReport.providerBreakdown.length !== 0 ||
    emptyReport.categoryBreakdown.length !== 0
  ) {
    throw new Error("Empty period did not return clean zeroed summary and empty arrays");
  }

  const emptyCalendar = await CalendarService.getCalendarData(userA.id, {
    year: 2099,
    month: 1,
  });
  if (
    emptyCalendar.allEvents.length !== 0 ||
    emptyCalendar.summary.totalMonthAmount !== 0 ||
    emptyCalendar.summary.totalEventsCount !== 0
  ) {
    throw new Error("Empty calendar period did not return clean zeroed values");
  }
  console.log("  ✅ PASS: Empty data handled gracefully with 0 amounts and no runtime errors");

  // -------------------------------------------------------------------------
  // Cleanup Test Data
  // -------------------------------------------------------------------------
  console.log("\n🧹 Cleaning up Phase 5 test records...");
  await prisma.installment.deleteMany({
    where: { name: { startsWith: "[PHASE5-TEST]" } },
  });
  console.log("  ✅ Clean up completed successfully");

  console.log("\n=======================================================");
  console.log("🎉 ALL 18 PHASE 5 CALENDAR, REPORTS & EXPORT TESTS PASSED!");
  console.log("=======================================================\n");
}

runPhase5Tests()
  .catch((err) => {
    console.error("❌ PHASE 5 TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
