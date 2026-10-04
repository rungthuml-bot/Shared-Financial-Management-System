import { Prisma } from "@prisma/client";

/**
 * Calculate the exact due date for an installment number, properly handling
 * months with 28, 29, 30, and 31 days without date overflow or drifting.
 */
export function calculateDueDate(
  startDate: Date | string,
  dueDay: number,
  installmentNumber: number
): Date {
  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
  
  // Calculate target month and year
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth(); // 0-indexed
  
  const targetMonthIndex = startMonth + (installmentNumber - 1);
  const targetYear = startYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;

  // Find max days in the target month (e.g. Feb 28 or 29, Apr 30, Oct 31)
  // Day 0 of next month in UTC gives the last day of target month
  const maxDaysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  
  // Clamp dueDay to the maximum valid day in that month
  const safeDay = Math.min(Math.max(1, dueDay), maxDaysInMonth);

  return new Date(Date.UTC(targetYear, targetMonth, safeDay, 0, 0, 0, 0));
}

/**
 * Determine payment status based on due date and whether payment was completed.
 */
export function determineInitialPaymentStatus(
  dueDate: Date,
  referenceDate: Date = new Date()
): "UPCOMING" | "DUE" | "OVERDUE" {
  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();
  const refDate = referenceDate.getUTCDate();

  const dueYear = dueDate.getUTCFullYear();
  const dueMonth = dueDate.getUTCMonth();
  const dueDateNum = dueDate.getUTCDate();

  if (refYear === dueYear && refMonth === dueMonth && refDate === dueDateNum) {
    return "DUE";
  }

  const refTime = Date.UTC(refYear, refMonth, refDate);
  const dueTime = Date.UTC(dueYear, dueMonth, dueDateNum);

  if (dueTime < refTime) {
    return "OVERDUE";
  }

  return "UPCOMING";
}

export interface GeneratedScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  amount: Prisma.Decimal;
  status: "UPCOMING" | "DUE" | "OVERDUE" | "PAID";
  splits: Array<{
    userId: string;
    percentage: Prisma.Decimal;
    amount: Prisma.Decimal;
    status: "UPCOMING" | "DUE" | "OVERDUE" | "PAID";
  }>;
}

/**
 * Generate full payment schedule with exact penny-perfect Decimal calculations.
 */
export function generateSchedule(params: {
  totalAmount: Prisma.Decimal | number | string;
  downPayment?: Prisma.Decimal | number | string;
  totalInstallments: number;
  startDate: Date | string;
  dueDay: number;
  ownershipType: "PERSONAL" | "SHARED";
  splitType?: "NONE" | "EQUAL" | "PERCENTAGE";
  ownerId: string;
  partnerId?: string | null;
  userSharePercent?: Prisma.Decimal | number | string;
  partnerSharePercent?: Prisma.Decimal | number | string;
}): GeneratedScheduleItem[] {
  const total = new Prisma.Decimal(params.totalAmount);
  const down = new Prisma.Decimal(params.downPayment ?? 0);
  const principal = total.minus(down);

  if (principal.lessThanOrEqualTo(0)) {
    throw new Error("ยอดเงินที่ต้องผ่อนชำระ (ราคาเต็ม - เงินดาวน์) ต้องมากกว่า 0");
  }

  if (params.totalInstallments <= 0 || !Number.isInteger(params.totalInstallments)) {
    throw new Error("จำนวนงวดต้องเป็นจำนวนเต็มบวก");
  }

  // Base monthly amount rounded down to 2 decimal places
  const baseMonthly = principal.dividedBy(params.totalInstallments).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
  // Remainder to distribute to the first installment to guarantee exact sum
  const totalAllocated = baseMonthly.times(params.totalInstallments);
  const remainder = principal.minus(totalAllocated);

  const items: GeneratedScheduleItem[] = [];

  for (let num = 1; num <= params.totalInstallments; num++) {
    // Add remainder cents to installment #1
    const paymentAmount = num === 1 ? baseMonthly.plus(remainder) : baseMonthly;
    const dueDate = calculateDueDate(params.startDate, params.dueDay, num);
    const initialStatus = determineInitialPaymentStatus(dueDate);

    const splits: GeneratedScheduleItem["splits"] = [];

    if (params.ownershipType === "SHARED" && params.partnerId) {
      if (params.splitType === "EQUAL") {
        const ownerShare = paymentAmount.dividedBy(2).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const partnerShare = paymentAmount.minus(ownerShare);

        splits.push({
          userId: params.ownerId,
          percentage: new Prisma.Decimal("50.00"),
          amount: ownerShare,
          status: initialStatus,
        });

        splits.push({
          userId: params.partnerId,
          percentage: new Prisma.Decimal("50.00"),
          amount: partnerShare,
          status: initialStatus,
        });
      } else if (params.splitType === "PERCENTAGE") {
        const userPct = new Prisma.Decimal(params.userSharePercent ?? 100);
        const partnerPct = new Prisma.Decimal(params.partnerSharePercent ?? 0);

        if (!userPct.plus(partnerPct).equals(new Prisma.Decimal(100))) {
          throw new Error("สัดส่วนเปอร์เซ็นต์รวมต้องเท่ากับ 100%");
        }

        const ownerShare = paymentAmount.times(userPct).dividedBy(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const partnerShare = paymentAmount.minus(ownerShare);

        splits.push({
          userId: params.ownerId,
          percentage: userPct,
          amount: ownerShare,
          status: initialStatus,
        });

        splits.push({
          userId: params.partnerId,
          percentage: partnerPct,
          amount: partnerShare,
          status: initialStatus,
        });
      }
    }

    items.push({
      installmentNumber: num,
      dueDate,
      amount: paymentAmount,
      status: initialStatus,
      splits,
    });
  }

  return items;
}
