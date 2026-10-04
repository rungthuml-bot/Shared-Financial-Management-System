import { Prisma, PaymentStatus, OwnershipType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  formatThaiMonthYear,
  getBangkokMonthRange,
  getBangkokDateParts,
} from "@/lib/date-utils";
import { DashboardService } from "./dashboard.service";

export interface CalendarFilterInput {
  year: number;
  month: number; // 1-12
  ownershipType?: "ALL" | OwnershipType;
  providerId?: string;
  categoryId?: string;
  status?: "ALL" | PaymentStatus;
}

export interface CalendarEventItem {
  id: string;
  installmentId: string;
  title: string;
  installmentNumber: number;
  totalInstallments: number;
  day: number;
  dueDate: string;
  dueDateFormatted: string;
  amount: number;
  myShare: number;
  status: PaymentStatus;
  ownershipType: OwnershipType;
  splitDisplay: string;
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
  paidAt?: string | null;
  splits: Array<{
    userId: string;
    userName: string;
    amount: number;
    percentage: number;
    status: PaymentStatus;
  }>;
}

export interface CalendarDayEvents {
  day: number;
  dateStr: string;
  events: CalendarEventItem[];
  totalAmount: number;
  hasOverdue: boolean;
  hasDue: boolean;
}

export interface CalendarData {
  year: number;
  month: number;
  monthName: string;
  totalDaysInMonth: number;
  firstDayOfWeek: number; // 0 for Sunday
  days: CalendarDayEvents[];
  allEvents: CalendarEventItem[];
  upcomingList: CalendarEventItem[];
  overdueList: CalendarEventItem[];
  summary: {
    totalMonthAmount: number;
    paidMonthAmount: number;
    remainingMonthAmount: number;
    totalEventsCount: number;
    paidCount: number;
    unpaidCount: number;
    overdueCount: number;
  };
  filterOptions: {
    providers: Array<{ id: string; name: string; slug: string }>;
    categories: Array<{ id: string; name: string; slug: string }>;
  };
}

export class CalendarService {
  static async getCalendarData(
    userId: string,
    input: CalendarFilterInput
  ): Promise<CalendarData> {
    if (!userId) {
      throw new Error("Unauthorized: Please sign in");
    }

    const year = input.year;
    const month = input.month; // 1-12

    const monthName = formatThaiMonthYear(year, month);
    const { startDate, endDate, totalDaysInMonth, firstDayOfWeek } = getBangkokMonthRange(year, month);

    const now = new Date();
    const todayParts = getBangkokDateParts(now);
    const todayStart = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day, 0, 0, 0, 0));

    // Build installment filter conditions
    const installmentWhere: Prisma.InstallmentWhereInput = {
      OR: [{ ownerId: userId }, { partnerId: userId }],
    };

    if (input.ownershipType && input.ownershipType !== "ALL") {
      installmentWhere.ownershipType = input.ownershipType;
    }
    if (input.providerId && input.providerId !== "ALL") {
      installmentWhere.providerId = input.providerId;
    }
    if (input.categoryId && input.categoryId !== "ALL") {
      installmentWhere.categoryId = input.categoryId;
    }

    // Query installments and their payments
    const installments = await prisma.installment.findMany({
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
    });

    // Also get all providers & categories for filters
    const [allProviders, allCategories] = await Promise.all([
      prisma.provider.findMany({ where: { active: true }, select: { id: true, name: true, slug: true } }),
      prisma.category.findMany({ where: { active: true }, select: { id: true, name: true, slug: true } }),
    ]);

    const allEvents: CalendarEventItem[] = [];
    const upcomingList: CalendarEventItem[] = [];
    const overdueList: CalendarEventItem[] = [];

    let totalMonthAmount = new Prisma.Decimal(0);
    let paidMonthAmount = new Prisma.Decimal(0);
    let paidCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;

    for (const inst of installments) {
      for (const p of inst.payments) {
        const userShare = DashboardService.getUserPaymentShare(userId, {
          amount: p.amount,
          installment: inst,
          splits: p.splits,
        });

        let splitDisplay = "PERSONAL";
        if (inst.ownershipType === "SHARED") {
          splitDisplay =
            inst.splitType === "EQUAL"
              ? "SHARED (50/50)"
              : `SHARED (${inst.userSharePercent}/${inst.partnerSharePercent})`;
        }

        const eventItem: CalendarEventItem = {
          id: p.id,
          installmentId: inst.id,
          title: inst.name,
          installmentNumber: p.installmentNumber,
          totalInstallments: inst.totalInstallments,
          day: getBangkokDateParts(p.dueDate).day,
          dueDate: p.dueDate.toISOString(),
          dueDateFormatted: formatDate(p.dueDate),
          amount: new Prisma.Decimal(p.amount).toNumber(),
          myShare: userShare.toNumber(),
          status: p.status,
          ownershipType: inst.ownershipType,
          splitDisplay,
          provider: {
            name: inst.provider.name,
            slug: inst.provider.slug,
            icon: inst.provider.icon,
            color: inst.provider.color,
          },
          category: inst.category
            ? { name: inst.category.name, slug: inst.category.slug }
            : null,
          paidAt: p.paidAt ? p.paidAt.toISOString() : null,
          splits: p.splits.map((s) => ({
            userId: s.userId,
            userName: s.user.name,
            amount: new Prisma.Decimal(s.amount).toNumber(),
            percentage: Number(s.percentage),
            status: s.status,
          })),
        };

        const isPaid = p.status === "PAID" || p.paidAt !== null;
        const pDueDate = new Date(p.dueDate);

        // Check if event is in the requested month
        if (pDueDate >= startDate && pDueDate <= endDate) {
          // Check status filter if applied
          if (!input.status || input.status === "ALL" || p.status === input.status) {
            allEvents.push(eventItem);
            totalMonthAmount = totalMonthAmount.plus(userShare);
            if (isPaid) {
              paidMonthAmount = paidMonthAmount.plus(userShare);
              paidCount++;
            } else {
              unpaidCount++;
              if (pDueDate < todayStart) {
                overdueCount++;
              }
            }
          }
        }

        // Collect general upcoming & overdue across user's active installments
        if (!isPaid && inst.status === "ACTIVE") {
          if (pDueDate < todayStart) {
            overdueList.push(eventItem);
          } else {
            upcomingList.push(eventItem);
          }
        }
      }
    }

    // Sort upcoming and overdue
    upcomingList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    overdueList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Group events by day of the month (1..totalDaysInMonth)
    const days: CalendarDayEvents[] = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayEvents = allEvents.filter((ev) => ev.day === d);
      const totalAmount = dayEvents.reduce((acc, ev) => acc + ev.myShare, 0);
      const hasOverdue = dayEvents.some((ev) => ev.status === "OVERDUE" || (ev.status !== "PAID" && new Date(ev.dueDate) < todayStart));
      const hasDue = dayEvents.some((ev) => ev.status === "DUE" || (ev.status !== "PAID" && new Date(ev.dueDate).toDateString() === todayStart.toDateString()));

      const dayDate = new Date(year, month - 1, d);
      days.push({
        day: d,
        dateStr: dayDate.toISOString(),
        events: dayEvents,
        totalAmount,
        hasOverdue,
        hasDue,
      });
    }

    const remainingMonthAmount = totalMonthAmount.minus(paidMonthAmount);

    return {
      year,
      month,
      monthName,
      totalDaysInMonth,
      firstDayOfWeek,
      days,
      allEvents,
      upcomingList: upcomingList.slice(0, 5),
      overdueList,
      summary: {
        totalMonthAmount: totalMonthAmount.toNumber(),
        paidMonthAmount: paidMonthAmount.toNumber(),
        remainingMonthAmount: Math.max(0, remainingMonthAmount.toNumber()),
        totalEventsCount: allEvents.length,
        paidCount,
        unpaidCount,
        overdueCount,
      },
      filterOptions: {
        providers: allProviders,
        categories: allCategories,
      },
    };
  }
}
