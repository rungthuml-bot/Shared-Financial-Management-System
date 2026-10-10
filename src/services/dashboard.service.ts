import { Prisma, PaymentStatus, OwnershipType, SplitType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatThaiMonthYear, getBangkokDateParts } from "@/lib/date-utils";

export type TimeframeFilter = "this_month" | "next_month" | "last_3_months" | "all_time";

export interface DashboardUpcomingItem {
  id: string;
  installmentId: string;
  installmentName: string;
  provider: {
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  };
  category?: {
    name: string;
    slug: string;
  } | null;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  dueDateFormatted: string;
  daysRemaining: number;
  totalAmount: number;
  myShareAmount: number;
  status: PaymentStatus;
  ownershipType: OwnershipType;
  splitType: SplitType;
  splitDisplay: string;
}

export interface DashboardOverdueItem {
  id: string;
  installmentId: string;
  installmentName: string;
  provider: {
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  };
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  dueDateFormatted: string;
  daysOverdue: number;
  totalAmount: number;
  myShareAmount: number;
  status: PaymentStatus;
  ownershipType: OwnershipType;
}

export interface DashboardInstallmentProgress {
  id: string;
  name: string;
  provider: {
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  };
  ownershipType: OwnershipType;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  progressPercent: number;
  nextDueDate: string | null;
}

export interface DashboardNetSettlement {
  hasSharedData: boolean;
  netAmount: number;
  direction: "you_owe" | "partner_owes" | "settled" | "none";
  currentUserName: string;
  partnerName: string;
  partnerId?: string | null;
  amountIOweOthers: number;
  amountOthersOweMe: number;
  summaryText: string;
  breakdownText: string;
  pendingCount: number;
}

export interface DashboardData {
  // Global Metrics (User's share)
  totalInstallmentAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  totalUpcomingAmount: number;
  totalDueAmount: number;
  totalOverdueAmount: number;

  // Counts
  activeInstallmentsCount: number;
  completedInstallmentsCount: number;
  personalInstallmentsCount: number;
  sharedInstallmentsCount: number;

  // Filtered Period Metrics
  timeframe: TimeframeFilter;
  period: {
    label: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paidPercentage: number;
    upcomingCount: number;
    overdueCount: number;
    dueTodayCount: number;
  };

  // Lists
  upcomingPayments: DashboardUpcomingItem[];
  overduePayments: DashboardOverdueItem[];
  installmentProgress: DashboardInstallmentProgress[];

  // Shared Settlement
  netSettlement: DashboardNetSettlement;

  // Chart Data
  monthlyTrend: Array<{
    month: string;
    paid: number;
    remaining: number;
    total: number;
  }>;

  categoryDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export class DashboardService {
  /**
   * Calculate date bounds based on timeframe filter.
   */
  static getTimeframeBounds(timeframe: TimeframeFilter, baseDate: Date = new Date()): {
    startDate?: Date;
    endDate?: Date;
    label: string;
  } {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth(); // 0-indexed

    switch (timeframe) {
      case "next_month": {
        const nextMonthDate = new Date(year, month + 1, 1);
        const nextMonthYear = nextMonthDate.getFullYear();
        const nextMonthIdx = nextMonthDate.getMonth();
        const start = new Date(nextMonthYear, nextMonthIdx, 1, 0, 0, 0, 0);
        const end = new Date(nextMonthYear, nextMonthIdx + 1, 0, 23, 59, 59, 999);
        return {
          startDate: start,
          endDate: end,
          label: formatThaiMonthYear(nextMonthYear, nextMonthIdx + 1),
        };
      }
      case "last_3_months": {
        const start = new Date(year, month - 2, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return {
          startDate: start,
          endDate: end,
          label: "3 เดือนล่าสุด",
        };
      }
      case "all_time": {
        return {
          label: "ทั้งหมด",
        };
      }
      case "this_month":
      default: {
        const start = new Date(year, month, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return {
          startDate: start,
          endDate: end,
          label: formatThaiMonthYear(year, month + 1),
        };
      }
    }
  }

  /**
   * Helper: Get user's share amount for a specific payment.
   */
  static getUserPaymentShare(
    userId: string,
    payment: {
      amount: Prisma.Decimal | number;
      installment: {
        ownershipType: OwnershipType;
        ownerId: string;
        userSharePercent: Prisma.Decimal | number;
        partnerSharePercent: Prisma.Decimal | number;
      };
      splits?: Array<{
        userId: string;
        amount: Prisma.Decimal | number;
      }>;
    }
  ): Prisma.Decimal {
    const totalPaymentAmount = new Prisma.Decimal(payment.amount);

    if (payment.installment.ownershipType === "PERSONAL") {
      return totalPaymentAmount;
    }

    // Check splits if populated
    if (payment.splits && payment.splits.length > 0) {
      const mySplit = payment.splits.find((s) => s.userId === userId);
      if (mySplit) {
        return new Prisma.Decimal(mySplit.amount);
      }
    }

    // Fallback to percentage
    const isOwner = payment.installment.ownerId === userId;
    const pct = new Prisma.Decimal(
      isOwner ? payment.installment.userSharePercent : payment.installment.partnerSharePercent
    ).dividedBy(100);

    return totalPaymentAmount.times(pct).toDecimalPlaces(2);
  }

  /**
   * Calculate Net Settlement between current user and partner(s).
   */
  static async calculateNetSettlement(
    userId: string
  ): Promise<DashboardNetSettlement> {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    const currentUserName = currentUser?.name || "คุณ";

    // 1. Fetch pending settlements involving this user
    const pendingSettlements = await prisma.settlement.findMany({
      where: {
        status: "PENDING",
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    // 2. Fetch paid shared payments to compute unpaid splits (where one paid for another)
    const paidSharedPayments = await prisma.installmentPayment.findMany({
      where: {
        status: "PAID",
        installment: {
          ownershipType: "SHARED",
          OR: [{ ownerId: userId }, { partnerId: userId }],
        },
      },
      include: {
        installment: {
          select: {
            ownerId: true,
            partnerId: true,
            owner: { select: { id: true, name: true } },
            partner: { select: { id: true, name: true } },
          },
        },
        splits: true,
      },
    });

    let amountOthersOweMe = new Prisma.Decimal(0);
    let amountIOweOthers = new Prisma.Decimal(0);
    let partnerName = "คู่ของคุณ";
    let partnerId: string | null = null;

    // Compute from pending settlements table
    for (const stl of pendingSettlements) {
      const stlAmount = new Prisma.Decimal(stl.amount);
      if (stl.toUserId === userId) {
        amountOthersOweMe = amountOthersOweMe.plus(stlAmount);
        partnerName = stl.fromUser.name;
        partnerId = stl.fromUserId;
      } else if (stl.fromUserId === userId) {
        amountIOweOthers = amountIOweOthers.plus(stlAmount);
        partnerName = stl.toUser.name;
        partnerId = stl.toUserId;
      }
    }

    // Compute from paid shared payments where splits were covered
    for (const payment of paidSharedPayments) {
      const payerId = payment.payerId || payment.installment.ownerId;
      const partner = payment.installment.ownerId === userId
        ? payment.installment.partner
        : payment.installment.owner;

      if (partner) {
        partnerName = partner.name;
        partnerId = partner.id;
      }

      for (const split of payment.splits) {
        const splitAmount = new Prisma.Decimal(split.amount);
        if (split.status !== "PAID") {
          if (payerId === userId && split.userId !== userId) {
            // User covered partner's split
            amountOthersOweMe = amountOthersOweMe.plus(splitAmount);
          } else if (payerId !== userId && split.userId === userId) {
            // Partner covered user's split
            amountIOweOthers = amountIOweOthers.plus(splitAmount);
          }
        }
      }
    }

    // If partnerId is still unknown, look up from any existing shared installment
    if (!partnerId) {
      const sharedInst = await prisma.installment.findFirst({
        where: {
          ownershipType: "SHARED",
          OR: [{ ownerId: userId }, { partnerId: userId }],
        },
        include: {
          owner: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true } },
        },
      });
      if (sharedInst) {
        const partner = sharedInst.ownerId === userId ? sharedInst.partner : sharedInst.owner;
        if (partner) {
          partnerName = partner.name;
          partnerId = partner.id;
        }
      }
    }

    const othersOweNum = amountOthersOweMe.toNumber();
    const iOweNum = amountIOweOthers.toNumber();
    const netDiff = amountOthersOweMe.minus(amountIOweOthers);
    const netAmount = Math.abs(netDiff.toNumber());

    let direction: "you_owe" | "partner_owes" | "settled" | "none" = "none";
    let summaryText = "ไม่มีรายการที่ต้องเคลียร์ระหว่างกัน";
    let breakdownText = "ยอดแบ่งจ่ายและสัญญาร่วมทั้งหมดสมดุลเรียบร้อย";

    const hasSharedData =
      pendingSettlements.length > 0 ||
      paidSharedPayments.length > 0 ||
      othersOweNum > 0 ||
      iOweNum > 0;

    if (!hasSharedData) {
      direction = "none";
    } else if (netDiff.greaterThan(0)) {
      direction = "partner_owes";
      summaryText = `${partnerName} ต้องโอนคืน ${currentUserName} ${formatCurrency(netAmount)}`;
      breakdownText = `คำนวณสุทธิ: ${currentUserName} จ่ายแทน ฿${othersOweNum.toLocaleString()} — ${partnerName} จ่ายแทน ฿${iOweNum.toLocaleString()}`;
    } else if (netDiff.lessThan(0)) {
      direction = "you_owe";
      summaryText = `คุณต้องโอนคืน ${partnerName} ${formatCurrency(netAmount)}`;
      breakdownText = `คำนวณสุทธิ: ${partnerName} จ่ายแทน ฿${iOweNum.toLocaleString()} — คุณจ่ายแทน ฿${othersOweNum.toLocaleString()}`;
    } else {
      direction = "settled";
      summaryText = "เคลียร์ยอดระหว่างกันครบถ้วนแล้ว (ยอดสุทธิ ฿0)";
      breakdownText = `ทั้งสองฝ่ายมียอดจ่ายแทนกันเท่ากันพอดี (ฝ่ายละ ฿${othersOweNum.toLocaleString()})`;
    }

    return {
      hasSharedData,
      netAmount,
      direction,
      currentUserName,
      partnerName,
      partnerId,
      amountIOweOthers: iOweNum,
      amountOthersOweMe: othersOweNum,
      summaryText,
      breakdownText,
      pendingCount: pendingSettlements.length,
    };
  }

  /**
   * Main Dashboard Data Aggregator
   */
  static async getDashboardData(
    userId: string,
    timeframe: TimeframeFilter = "this_month"
  ): Promise<DashboardData> {
    if (!userId) {
      throw new Error("Unauthorized: Please sign in");
    }

    const now = new Date();
    const todayParts = getBangkokDateParts(now);
    const todayStart = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day, 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day, 23, 59, 59, 999));

    const bounds = this.getTimeframeBounds(timeframe, now);

    // 1. Fetch user installments (both personal and shared)
    const userInstallments = await prisma.installment.findMany({
      where: {
        OR: [{ ownerId: userId }, { partnerId: userId }],
      },
      include: {
        provider: true,
        category: true,
        payments: {
          include: {
            splits: true,
          },
          orderBy: { installmentNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Global Metric Accumulators
    let totalInstallmentAmount = new Prisma.Decimal(0);
    let totalPaidAmount = new Prisma.Decimal(0);
    let totalUpcomingAmount = new Prisma.Decimal(0);
    let totalDueAmount = new Prisma.Decimal(0);
    let totalOverdueAmount = new Prisma.Decimal(0);

    let activeCount = 0;
    let completedCount = 0;
    let personalCount = 0;
    let sharedCount = 0;

    // Filtered Period Accumulators
    let periodTotalAmount = new Prisma.Decimal(0);
    let periodPaidAmount = new Prisma.Decimal(0);
    let periodUpcomingCount = 0;
    let periodOverdueCount = 0;
    let periodDueTodayCount = 0;

    const allPaymentsWithContext: Array<{
      payment: typeof userInstallments[0]["payments"][0];
      installment: typeof userInstallments[0];
      userShare: Prisma.Decimal;
    }> = [];

    const categoryTotalsMap = new Map<string, { name: string; amount: Prisma.Decimal; color: string }>();

    // 3. Process Installments and Payments
    for (const inst of userInstallments) {
      if (inst.status === "ACTIVE") activeCount++;
      if (inst.status === "COMPLETED") completedCount++;
      if (inst.ownershipType === "PERSONAL") personalCount++;
      if (inst.ownershipType === "SHARED") sharedCount++;

      // Compute user's total principal share for this installment
      const isOwner = inst.ownerId === userId;
      let installmentShareTotal = new Prisma.Decimal(0);

      if (inst.ownershipType === "PERSONAL") {
        installmentShareTotal = new Prisma.Decimal(inst.totalAmount);
      } else {
        const pct = new Prisma.Decimal(
          isOwner ? inst.userSharePercent : inst.partnerSharePercent
        ).dividedBy(100);
        installmentShareTotal = new Prisma.Decimal(inst.totalAmount).times(pct).toDecimalPlaces(2);
      }
      totalInstallmentAmount = totalInstallmentAmount.plus(installmentShareTotal);

      // Track category distribution
      const catName = inst.category?.name || "ทั่วไป";
      const catColor = inst.category?.color || "#6366f1";
      const existingCat = categoryTotalsMap.get(catName) || {
        name: catName,
        amount: new Prisma.Decimal(0),
        color: catColor,
      };
      categoryTotalsMap.set(catName, {
        name: catName,
        amount: existingCat.amount.plus(installmentShareTotal),
        color: catColor,
      });

      // Process each payment
      for (const p of inst.payments) {
        const userShare = this.getUserPaymentShare(userId, {
          amount: p.amount,
          installment: inst,
          splits: p.splits,
        });

        allPaymentsWithContext.push({
          payment: p,
          installment: inst,
          userShare,
        });

        // Global status totals
        const isPaid = p.status === "PAID" || p.paidAt !== null;
        if (isPaid) {
          totalPaidAmount = totalPaidAmount.plus(userShare);
        } else {
          const dueDate = new Date(p.dueDate);
          if (dueDate < todayStart) {
            totalOverdueAmount = totalOverdueAmount.plus(userShare);
          } else if (dueDate <= todayEnd) {
            totalDueAmount = totalDueAmount.plus(userShare);
          } else {
            totalUpcomingAmount = totalUpcomingAmount.plus(userShare);
          }
        }

        // Period filter checking
        const pDueDate = new Date(p.dueDate);
        const inPeriod =
          (!bounds.startDate || pDueDate >= bounds.startDate) &&
          (!bounds.endDate || pDueDate <= bounds.endDate);

        if (inPeriod) {
          periodTotalAmount = periodTotalAmount.plus(userShare);
          if (isPaid) {
            periodPaidAmount = periodPaidAmount.plus(userShare);
          } else {
            if (pDueDate < todayStart) {
              periodOverdueCount++;
            } else if (pDueDate <= todayEnd) {
              periodDueTodayCount++;
            } else {
              periodUpcomingCount++;
            }
          }
        }
      }
    }

    const totalRemainingAmount = totalInstallmentAmount.minus(totalPaidAmount);
    const periodRemainingAmount = periodTotalAmount.minus(periodPaidAmount);
    const periodPaidPct = periodTotalAmount.greaterThan(0)
      ? Math.round(periodPaidAmount.dividedBy(periodTotalAmount).times(100).toNumber())
      : 0;

    // 4. Upcoming Payments List (Nearest unpaid due dates >= today or today's due)
    const upcomingPayments = allPaymentsWithContext
      .filter((item) => {
        const isPaid = item.payment.status === "PAID" || item.payment.paidAt !== null;
        return !isPaid && new Date(item.payment.dueDate) >= todayStart;
      })
      .sort((a, b) => new Date(a.payment.dueDate).getTime() - new Date(b.payment.dueDate).getTime())
      .slice(0, 5)
      .map((item) => {
        const dueDate = new Date(item.payment.dueDate);
        const diffMs = dueDate.getTime() - todayStart.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        let splitDisplay = "PERSONAL";
        if (item.installment.ownershipType === "SHARED") {
          splitDisplay =
            item.installment.splitType === "EQUAL"
              ? "SHARED (50/50)"
              : `SHARED (${item.installment.userSharePercent}/${item.installment.partnerSharePercent})`;
        }

        return {
          id: item.payment.id,
          installmentId: item.installment.id,
          installmentName: item.installment.name,
          provider: {
            name: item.installment.provider.name,
            slug: item.installment.provider.slug,
            icon: item.installment.provider.icon,
            color: item.installment.provider.color,
          },
          category: item.installment.category
            ? { name: item.installment.category.name, slug: item.installment.category.slug }
            : null,
          installmentNumber: item.payment.installmentNumber,
          totalInstallments: item.installment.totalInstallments,
          dueDate: item.payment.dueDate.toISOString(),
          dueDateFormatted: formatDate(item.payment.dueDate),
          daysRemaining,
          totalAmount: new Prisma.Decimal(item.payment.amount).toNumber(),
          myShareAmount: item.userShare.toNumber(),
          status: item.payment.status,
          ownershipType: item.installment.ownershipType,
          splitType: item.installment.splitType,
          splitDisplay,
        };
      });

    // 5. Overdue Payments List (unpaid payments with due date < today)
    const overduePayments = allPaymentsWithContext
      .filter((item) => {
        const isPaid = item.payment.status === "PAID" || item.payment.paidAt !== null;
        return !isPaid && new Date(item.payment.dueDate) < todayStart;
      })
      .sort((a, b) => new Date(a.payment.dueDate).getTime() - new Date(b.payment.dueDate).getTime())
      .map((item) => {
        const dueDate = new Date(item.payment.dueDate);
        const diffMs = todayStart.getTime() - dueDate.getTime();
        const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        return {
          id: item.payment.id,
          installmentId: item.installment.id,
          installmentName: item.installment.name,
          provider: {
            name: item.installment.provider.name,
            slug: item.installment.provider.slug,
            icon: item.installment.provider.icon,
            color: item.installment.provider.color,
          },
          installmentNumber: item.payment.installmentNumber,
          totalInstallments: item.installment.totalInstallments,
          dueDate: item.payment.dueDate.toISOString(),
          dueDateFormatted: formatDate(item.payment.dueDate),
          daysOverdue,
          totalAmount: new Prisma.Decimal(item.payment.amount).toNumber(),
          myShareAmount: item.userShare.toNumber(),
          status: item.payment.status,
          ownershipType: item.installment.ownershipType,
        };
      });

    // 6. Active Installment Progress
    const installmentProgress = userInstallments
      .filter((inst) => inst.status === "ACTIVE")
      .map((inst) => {
        const paidPayments = inst.payments.filter((p) => p.status === "PAID" || p.paidAt !== null);
        const paidCount = paidPayments.length;
        const paidShare = paidPayments.reduce((acc, p) => {
          return acc.plus(
            this.getUserPaymentShare(userId, {
              amount: p.amount,
              installment: inst,
              splits: p.splits,
            })
          );
        }, new Prisma.Decimal(0));

        let totalShare = new Prisma.Decimal(0);
        if (inst.ownershipType === "PERSONAL") {
          totalShare = new Prisma.Decimal(inst.totalAmount);
        } else {
          const isOwner = inst.ownerId === userId;
          const pct = new Prisma.Decimal(
            isOwner ? inst.userSharePercent : inst.partnerSharePercent
          ).dividedBy(100);
          totalShare = new Prisma.Decimal(inst.totalAmount).times(pct).toDecimalPlaces(2);
        }

        const remainingShare = totalShare.minus(paidShare);
        const progressPercent = Math.min(
          100,
          inst.totalInstallments > 0
            ? Math.round((paidCount / inst.totalInstallments) * 100)
            : 0
        );

        // Next due payment
        const nextUnpaid = inst.payments.find(
          (p) => p.status !== "PAID" && p.paidAt === null
        );

        return {
          id: inst.id,
          name: inst.name,
          provider: {
            name: inst.provider.name,
            slug: inst.provider.slug,
            icon: inst.provider.icon,
            color: inst.provider.color,
          },
          ownershipType: inst.ownershipType,
          totalAmount: totalShare.toNumber(),
          paidAmount: paidShare.toNumber(),
          remainingAmount: Math.max(0, remainingShare.toNumber()),
          totalInstallments: inst.totalInstallments,
          paidInstallments: paidCount,
          progressPercent,
          nextDueDate: nextUnpaid ? formatDate(nextUnpaid.dueDate) : null,
        };
      });

    // 7. Monthly Trend (6 months window: 2 months back, current month, 3 months ahead)
    const thaiShortMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const monthlyTrendMap = new Map<string, { paid: Prisma.Decimal; remaining: Prisma.Decimal }>();

    for (let i = -2; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrendMap.set(key, {
        paid: new Prisma.Decimal(0),
        remaining: new Prisma.Decimal(0),
      });
    }

    for (const item of allPaymentsWithContext) {
      const d = new Date(item.payment.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyTrendMap.has(key)) {
        const bucket = monthlyTrendMap.get(key)!;
        const isPaid = item.payment.status === "PAID" || item.payment.paidAt !== null;
        if (isPaid) {
          bucket.paid = bucket.paid.plus(item.userShare);
        } else {
          bucket.remaining = bucket.remaining.plus(item.userShare);
        }
      }
    }

    const monthlyTrend = Array.from(monthlyTrendMap.entries()).map(([key, val]) => {
      const [, mStr] = key.split("-");
      const mIdx = parseInt(mStr, 10) - 1;
      const paidNum = val.paid.toNumber();
      const remainingNum = val.remaining.toNumber();
      return {
        month: thaiShortMonths[mIdx],
        paid: paidNum,
        remaining: remainingNum,
        total: paidNum + remainingNum,
      };
    });

    // 8. Category Distribution
    const categoryDistribution = Array.from(categoryTotalsMap.values())
      .filter((c) => c.amount.greaterThan(0))
      .map((c) => ({
        name: c.name,
        value: c.amount.toNumber(),
        color: c.color,
      }));

    // 9. Shared Net Settlement
    const netSettlement = await this.calculateNetSettlement(userId);

    return {
      totalInstallmentAmount: totalInstallmentAmount.toNumber(),
      totalPaidAmount: totalPaidAmount.toNumber(),
      totalRemainingAmount: Math.max(0, totalRemainingAmount.toNumber()),
      totalUpcomingAmount: totalUpcomingAmount.toNumber(),
      totalDueAmount: totalDueAmount.toNumber(),
      totalOverdueAmount: totalOverdueAmount.toNumber(),

      activeInstallmentsCount: activeCount,
      completedInstallmentsCount: completedCount,
      personalInstallmentsCount: personalCount,
      sharedInstallmentsCount: sharedCount,

      timeframe,
      period: {
        label: bounds.label,
        totalAmount: periodTotalAmount.toNumber(),
        paidAmount: periodPaidAmount.toNumber(),
        remainingAmount: Math.max(0, periodRemainingAmount.toNumber()),
        paidPercentage: periodPaidPct,
        upcomingCount: periodUpcomingCount,
        overdueCount: periodOverdueCount,
        dueTodayCount: periodDueTodayCount,
      },

      upcomingPayments,
      overduePayments,
      installmentProgress,
      netSettlement,
      monthlyTrend,
      categoryDistribution,
    };
  }
}
