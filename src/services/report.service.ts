import { Prisma, PaymentStatus, OwnershipType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  THAI_SHORT_MONTH_NAMES,
  formatThaiMonthYear,
  getBangkokDateParts,
} from "@/lib/date-utils";
import { DashboardService } from "./dashboard.service";

export type ReportPeriod =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "all_time"
  | "custom";

export interface ReportFilterInput {
  period: ReportPeriod;
  customStartDate?: string;
  customEndDate?: string;
  ownershipType?: "ALL" | OwnershipType;
  providerId?: string;
  categoryId?: string;
  status?: "ALL" | PaymentStatus;
}

export interface ReportTableRow {
  id: string;
  installmentId: string;
  dueDate: string;
  dueDateFormatted: string;
  installmentName: string;
  provider: {
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
  };
  category: {
    name: string;
    slug: string;
  } | null;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  myShare: number;
  status: PaymentStatus;
  paidAtFormatted: string | null;
  ownershipType: OwnershipType;
  splitDisplay: string;
}

export interface ReportProviderBreakdown {
  providerId: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentCount: number;
}

export interface ReportCategoryBreakdown {
  categoryId: string;
  name: string;
  slug: string;
  color: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  percentage: number;
  paymentCount: number;
}

export interface ReportData {
  periodLabel: string;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
  summary: {
    totalInstallmentAmount: number;
    totalPaidAmount: number;
    totalRemainingAmount: number;
    totalOverdueAmount: number;
    totalPaymentsCount: number;
    paidPaymentsCount: number;
    remainingPaymentsCount: number;
  };
  personalVsShared: {
    personal: {
      totalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      count: number;
    };
    shared: {
      totalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      count: number;
    };
  };
  providerBreakdown: ReportProviderBreakdown[];
  categoryBreakdown: ReportCategoryBreakdown[];
  monthlyTrend: Array<{
    month: string;
    paid: number;
    remaining: number;
    overdue: number;
    total: number;
  }>;
  netSettlement: Awaited<ReturnType<typeof DashboardService.calculateNetSettlement>>;
  tableRows: ReportTableRow[];
  filterOptions: {
    providers: Array<{ id: string; name: string; slug: string }>;
    categories: Array<{ id: string; name: string; slug: string }>;
  };
}

export class ReportService {
  /**
   * Determine date range boundaries from period filter.
   */
  static getDateBounds(input: ReportFilterInput, now: Date = new Date()): {
    startDate?: Date;
    endDate?: Date;
    label: string;
  } {
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (input.period) {
      case "last_month": {
        const d = new Date(year, month - 1, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        return {
          startDate: new Date(y, m, 1, 0, 0, 0, 0),
          endDate: new Date(y, m + 1, 0, 23, 59, 59, 999),
          label: formatThaiMonthYear(y, m + 1),
        };
      }
      case "last_3_months": {
        return {
          startDate: new Date(year, month - 2, 1, 0, 0, 0, 0),
          endDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
          label: "3 เดือนล่าสุด",
        };
      }
      case "this_year": {
        return {
          startDate: new Date(year, 0, 1, 0, 0, 0, 0),
          endDate: new Date(year, 11, 31, 23, 59, 59, 999),
          label: `ปี ${year + 543}`,
        };
      }
      case "custom": {
        const start = input.customStartDate ? new Date(input.customStartDate) : undefined;
        const end = input.customEndDate ? new Date(input.customEndDate) : undefined;
        if (end) end.setHours(23, 59, 59, 999);
        return {
          startDate: start,
          endDate: end,
          label: start && end ? `${formatDate(start)} - ${formatDate(end)}` : "กำหนดเอง",
        };
      }
      case "all_time": {
        return {
          label: "ทั้งหมด",
        };
      }
      case "this_month":
      default: {
        return {
          startDate: new Date(year, month, 1, 0, 0, 0, 0),
          endDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
          label: formatThaiMonthYear(year, month + 1),
        };
      }
    }
  }

  /**
   * Aggregate comprehensive report data.
   */
  static async getReportData(
    userId: string,
    filter: ReportFilterInput
  ): Promise<ReportData> {
    if (!userId) {
      throw new Error("Unauthorized: Please sign in");
    }

    const now = new Date();
    const todayParts = getBangkokDateParts(now);
    const todayStart = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day, 0, 0, 0, 0));
    const bounds = this.getDateBounds(filter, now);

    // Build installment filter conditions
    const installmentWhere: Prisma.InstallmentWhereInput = {
      OR: [{ ownerId: userId }, { partnerId: userId }],
    };

    if (filter.ownershipType && filter.ownershipType !== "ALL") {
      installmentWhere.ownershipType = filter.ownershipType;
    }
    if (filter.providerId && filter.providerId !== "ALL") {
      installmentWhere.providerId = filter.providerId;
    }
    if (filter.categoryId && filter.categoryId !== "ALL") {
      installmentWhere.categoryId = filter.categoryId;
    }

    // Query installments with relations
    const [installments, allProviders, allCategories, netSettlement] = await Promise.all([
      prisma.installment.findMany({
        where: installmentWhere,
        include: {
          provider: true,
          category: true,
          payments: {
            include: {
              splits: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { dueDate: "asc" },
          },
        },
      }),
      prisma.provider.findMany({ where: { active: true }, select: { id: true, name: true, slug: true } }),
      prisma.category.findMany({ where: { active: true }, select: { id: true, name: true, slug: true } }),
      DashboardService.calculateNetSettlement(userId),
    ]);

    // Metric accumulators
    let totalInstallmentAmount = new Prisma.Decimal(0);
    let totalPaidAmount = new Prisma.Decimal(0);
    let totalRemainingAmount = new Prisma.Decimal(0);
    let totalOverdueAmount = new Prisma.Decimal(0);

    let totalPaymentsCount = 0;
    let paidPaymentsCount = 0;
    let remainingPaymentsCount = 0;

    // Personal vs Shared
    let personalTotal = new Prisma.Decimal(0);
    let personalPaid = new Prisma.Decimal(0);
    let personalRemaining = new Prisma.Decimal(0);
    let personalCount = 0;

    let sharedTotal = new Prisma.Decimal(0);
    let sharedPaid = new Prisma.Decimal(0);
    let sharedRemaining = new Prisma.Decimal(0);
    let sharedCount = 0;

    // Maps for Provider and Category breakdowns
    const providerMap = new Map<
      string,
      {
        provider: typeof installments[0]["provider"];
        total: Prisma.Decimal;
        paid: Prisma.Decimal;
        remaining: Prisma.Decimal;
        count: number;
      }
    >();

    const categoryMap = new Map<
      string,
      {
        category: { id: string; name: string; slug: string; color: string | null };
        total: Prisma.Decimal;
        paid: Prisma.Decimal;
        remaining: Prisma.Decimal;
        count: number;
      }
    >();

    // Table rows
    const tableRows: ReportTableRow[] = [];

    // Monthly Trend Map
    const trendMap = new Map<
      string,
      { paid: Prisma.Decimal; remaining: Prisma.Decimal; overdue: Prisma.Decimal }
    >();

    // Initialize 6 months in trend map
    for (let i = -3; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      trendMap.set(key, {
        paid: new Prisma.Decimal(0),
        remaining: new Prisma.Decimal(0),
        overdue: new Prisma.Decimal(0),
      });
    }

    for (const inst of installments) {
      for (const p of inst.payments) {
        const pDueDate = new Date(p.dueDate);

        // Check date range boundary
        const inDateRange =
          (!bounds.startDate || pDueDate >= bounds.startDate) &&
          (!bounds.endDate || pDueDate <= bounds.endDate);

        if (!inDateRange) continue;

        // Check payment status filter
        if (filter.status && filter.status !== "ALL" && p.status !== filter.status) {
          continue;
        }

        const userShare = DashboardService.getUserPaymentShare(userId, {
          amount: p.amount,
          installment: inst,
          splits: p.splits,
        });

        const isPaid = p.status === "PAID" || p.paidAt !== null;
        const isOverdue = !isPaid && pDueDate < todayStart;

        totalInstallmentAmount = totalInstallmentAmount.plus(userShare);
        totalPaymentsCount++;

        if (isPaid) {
          totalPaidAmount = totalPaidAmount.plus(userShare);
          paidPaymentsCount++;
        } else {
          totalRemainingAmount = totalRemainingAmount.plus(userShare);
          remainingPaymentsCount++;
          if (isOverdue) {
            totalOverdueAmount = totalOverdueAmount.plus(userShare);
          }
        }

        // Personal vs Shared
        if (inst.ownershipType === "PERSONAL") {
          personalTotal = personalTotal.plus(userShare);
          personalCount++;
          if (isPaid) personalPaid = personalPaid.plus(userShare);
          else personalRemaining = personalRemaining.plus(userShare);
        } else {
          sharedTotal = sharedTotal.plus(userShare);
          sharedCount++;
          if (isPaid) sharedPaid = sharedPaid.plus(userShare);
          else sharedRemaining = sharedRemaining.plus(userShare);
        }

        // Provider Breakdown
        const provKey = inst.provider.id;
        const existingProv = providerMap.get(provKey) || {
          provider: inst.provider,
          total: new Prisma.Decimal(0),
          paid: new Prisma.Decimal(0),
          remaining: new Prisma.Decimal(0),
          count: 0,
        };
        existingProv.total = existingProv.total.plus(userShare);
        existingProv.count++;
        if (isPaid) existingProv.paid = existingProv.paid.plus(userShare);
        else existingProv.remaining = existingProv.remaining.plus(userShare);
        providerMap.set(provKey, existingProv);

        // Category Breakdown
        const catKey = inst.category?.id || "uncategorized";
        const catObj = inst.category || {
          id: "uncategorized",
          name: "ทั่วไป",
          slug: "uncategorized",
          color: "#94a3b8",
        };
        const existingCat = categoryMap.get(catKey) || {
          category: catObj,
          total: new Prisma.Decimal(0),
          paid: new Prisma.Decimal(0),
          remaining: new Prisma.Decimal(0),
          count: 0,
        };
        existingCat.total = existingCat.total.plus(userShare);
        existingCat.count++;
        if (isPaid) existingCat.paid = existingCat.paid.plus(userShare);
        else existingCat.remaining = existingCat.remaining.plus(userShare);
        categoryMap.set(catKey, existingCat);

        // Monthly Trend
        const trendKey = `${pDueDate.getFullYear()}-${String(pDueDate.getMonth() + 1).padStart(2, "0")}`;
        if (!trendMap.has(trendKey)) {
          trendMap.set(trendKey, {
            paid: new Prisma.Decimal(0),
            remaining: new Prisma.Decimal(0),
            overdue: new Prisma.Decimal(0),
          });
        }
        const bucket = trendMap.get(trendKey)!;
        if (isPaid) {
          bucket.paid = bucket.paid.plus(userShare);
        } else {
          bucket.remaining = bucket.remaining.plus(userShare);
          if (isOverdue) {
            bucket.overdue = bucket.overdue.plus(userShare);
          }
        }

        // Table Row Item
        let splitDisplay = "PERSONAL";
        if (inst.ownershipType === "SHARED") {
          splitDisplay =
            inst.splitType === "EQUAL"
              ? "SHARED (50/50)"
              : `SHARED (${inst.userSharePercent}/${inst.partnerSharePercent})`;
        }

        tableRows.push({
          id: p.id,
          installmentId: inst.id,
          dueDate: p.dueDate.toISOString(),
          dueDateFormatted: formatDate(p.dueDate),
          installmentName: inst.name,
          provider: {
            name: inst.provider.name,
            slug: inst.provider.slug,
            color: inst.provider.color,
            icon: inst.provider.icon,
          },
          category: inst.category
            ? { name: inst.category.name, slug: inst.category.slug }
            : null,
          installmentNumber: p.installmentNumber,
          totalInstallments: inst.totalInstallments,
          amount: new Prisma.Decimal(p.amount).toNumber(),
          myShare: userShare.toNumber(),
          status: p.status,
          paidAtFormatted: p.paidAt ? formatDate(p.paidAt) : null,
          ownershipType: inst.ownershipType,
          splitDisplay,
        });
      }
    }

    // Sort table rows by dueDate asc
    tableRows.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Format Provider Breakdown
    const providerBreakdown: ReportProviderBreakdown[] = Array.from(providerMap.values())
      .map((item) => ({
        providerId: item.provider.id,
        name: item.provider.name,
        slug: item.provider.slug,
        color: item.provider.color,
        icon: item.provider.icon,
        totalAmount: item.total.toNumber(),
        paidAmount: item.paid.toNumber(),
        remainingAmount: item.remaining.toNumber(),
        paymentCount: item.count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Format Category Breakdown
    const categoryBreakdown: ReportCategoryBreakdown[] = Array.from(categoryMap.values())
      .map((item) => {
        const total = item.total.toNumber();
        const percentage = totalInstallmentAmount.greaterThan(0)
          ? Math.round(item.total.dividedBy(totalInstallmentAmount).times(100).toNumber())
          : 0;
        return {
          categoryId: item.category.id,
          name: item.category.name,
          slug: item.category.slug,
          color: item.category.color,
          totalAmount: total,
          paidAmount: item.paid.toNumber(),
          remainingAmount: item.remaining.toNumber(),
          percentage,
          paymentCount: item.count,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Format Monthly Trend
    const monthlyTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const [, mStr] = key.split("-");
        const mIdx = parseInt(mStr, 10) - 1;
        const paidNum = val.paid.toNumber();
        const remainingNum = val.remaining.toNumber();
        const overdueNum = val.overdue.toNumber();
        return {
          month: THAI_SHORT_MONTH_NAMES[mIdx],
          paid: paidNum,
          remaining: remainingNum,
          overdue: overdueNum,
          total: paidNum + remainingNum,
        };
      });

    return {
      periodLabel: bounds.label,
      dateRange: {
        startDate: bounds.startDate?.toISOString(),
        endDate: bounds.endDate?.toISOString(),
      },
      summary: {
        totalInstallmentAmount: totalInstallmentAmount.toNumber(),
        totalPaidAmount: totalPaidAmount.toNumber(),
        totalRemainingAmount: Math.max(0, totalRemainingAmount.toNumber()),
        totalOverdueAmount: totalOverdueAmount.toNumber(),
        totalPaymentsCount,
        paidPaymentsCount,
        remainingPaymentsCount,
      },
      personalVsShared: {
        personal: {
          totalAmount: personalTotal.toNumber(),
          paidAmount: personalPaid.toNumber(),
          remainingAmount: personalRemaining.toNumber(),
          count: personalCount,
        },
        shared: {
          totalAmount: sharedTotal.toNumber(),
          paidAmount: sharedPaid.toNumber(),
          remainingAmount: sharedRemaining.toNumber(),
          count: sharedCount,
        },
      },
      providerBreakdown,
      categoryBreakdown,
      monthlyTrend,
      netSettlement,
      tableRows,
      filterOptions: {
        providers: allProviders,
        categories: allCategories,
      },
    };
  }
}
