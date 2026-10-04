import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { OwnershipType, InstallmentStatus } from "@prisma/client";
import type { InstallmentWithDetails, PaymentWithSplits } from "@/types/installment";
import type { CreateInstallmentInput } from "@/validators/installment";
import {
  generateSchedule,
  determineInitialPaymentStatus,
} from "@/lib/installment-calculator";

export interface UpdateInstallmentInput {
  id: string;
  name?: string;
  description?: string;
  providerId?: string;
  categoryId?: string;
  note?: string;
  dueDay?: number;
  totalAmount?: number;
  downPayment?: number;
  totalInstallments?: number;
  userSharePercent?: number;
  partnerSharePercent?: number;
}

export class InstallmentService {
  /**
   * Calculate monthly payment with Decimal arithmetic
   */
  static calculateInstallmentAmount(
    totalAmount: Prisma.Decimal | number,
    downPayment: Prisma.Decimal | number,
    totalInstallments: number
  ): Prisma.Decimal {
    const total = new Prisma.Decimal(totalAmount);
    const down = new Prisma.Decimal(downPayment);
    const principal = total.minus(down);
    if (principal.lessThanOrEqualTo(0) || totalInstallments <= 0) {
      return new Prisma.Decimal("0.00");
    }
    return principal
      .dividedBy(totalInstallments)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
  }

  /**
   * Compute split amounts for Shared installments using Decimal.
   */
  static computeSplits(
    installmentAmount: Prisma.Decimal | number,
    splitType: "NONE" | "EQUAL" | "PERCENTAGE",
    userPercent = 100
  ): { userAmount: Prisma.Decimal; partnerAmount: Prisma.Decimal } {
    const amount = new Prisma.Decimal(installmentAmount);

    if (splitType === "EQUAL") {
      const half = amount
        .dividedBy(2)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const otherHalf = amount.minus(half);
      return { userAmount: half, partnerAmount: otherHalf };
    }

    if (splitType === "PERCENTAGE") {
      const uPct = new Prisma.Decimal(userPercent).dividedBy(100);
      const userAmt = amount
        .times(uPct)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const partnerAmt = amount.minus(userAmt);
      return { userAmount: userAmt, partnerAmount: partnerAmt };
    }

    return { userAmount: amount, partnerAmount: new Prisma.Decimal("0.00") };
  }

  /**
   * Retrieve active providers for selection.
   */
  static async getProviders() {
    return prisma.provider.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Retrieve active categories for selection.
   */
  static async getCategories() {
    return prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Retrieve potential partners for shared installments.
   */
  static async getPotentialPartners(currentUserId: string) {
    return prisma.user.findMany({
      where: { id: { not: currentUserId } },
      select: { id: true, name: true, email: true, image: true },
    });
  }

  /**
   * Create an Installment with its complete Payment Schedule & Splits in an atomic transaction.
   */
  static async createInstallment(
    ownerId: string,
    input: CreateInstallmentInput
  ): Promise<InstallmentWithDetails> {
    if (!ownerId) {
      throw new Error("Unauthorized: เจ้าของรายการต้องเข้าสู่ระบบก่อน");
    }

    const totalAmountDec = new Prisma.Decimal(input.totalAmount);
    const downPaymentDec = new Prisma.Decimal(input.downPayment ?? 0);
    const principal = totalAmountDec.minus(downPaymentDec);

    if (principal.lessThanOrEqualTo(0)) {
      throw new Error("ยอดผ่อนชำระต้องมากกว่า 0 บาท");
    }

    const installmentAmountDec = principal
      .dividedBy(input.totalInstallments)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);

    // Validate partner if shared
    if (input.ownershipType === "SHARED" && !input.partnerId) {
      throw new Error("กรุณาระบุคู่แชร์สำหรับรายการผ่อนร่วม");
    }

    // Generate schedule items with exact penny-perfect calculation
    const scheduleItems = generateSchedule({
      totalAmount: totalAmountDec,
      downPayment: downPaymentDec,
      totalInstallments: input.totalInstallments,
      startDate: input.startDate,
      dueDay: input.dueDay,
      ownershipType: input.ownershipType,
      splitType: input.splitType,
      ownerId,
      partnerId: input.partnerId,
      userSharePercent: input.userSharePercent,
      partnerSharePercent: input.partnerSharePercent,
    });

    // Execute atomic creation in transaction
    return prisma.$transaction(async (tx) => {
      // 1. Create Installment record
      const installment = await tx.installment.create({
        data: {
          ownerId,
          partnerId: input.ownershipType === "SHARED" ? input.partnerId : null,
          providerId: input.providerId,
          categoryId: input.categoryId || null,
          name: input.name,
          description: input.description,
          totalAmount: totalAmountDec,
          downPayment: downPaymentDec,
          installmentAmount: installmentAmountDec,
          totalInstallments: input.totalInstallments,
          startDate: new Date(input.startDate),
          dueDay: input.dueDay,
          ownershipType: input.ownershipType,
          splitType: input.splitType,
          userSharePercent: new Prisma.Decimal(input.userSharePercent ?? 100),
          partnerSharePercent: new Prisma.Decimal(input.partnerSharePercent ?? 0),
          status: "ACTIVE",
          note: input.note,
        },
      });

      // 2. Create Payment Schedule & Splits
      for (const item of scheduleItems) {
        const payment = await tx.installmentPayment.create({
          data: {
            installmentId: installment.id,
            installmentNumber: item.installmentNumber,
            dueDate: item.dueDate,
            amount: item.amount,
            status: item.status,
          },
        });

        // Create Splits if any
        if (item.splits.length > 0) {
          for (const sp of item.splits) {
            await tx.paymentSplit.create({
              data: {
                paymentId: payment.id,
                userId: sp.userId,
                percentage: sp.percentage,
                amount: sp.amount,
                status: sp.status,
              },
            });
          }
        }
      }

      // Return fully loaded installment
      const result = await tx.installment.findUnique({
        where: { id: installment.id },
        include: {
          provider: true,
          category: true,
          owner: { select: { id: true, name: true, email: true, image: true } },
          partner: { select: { id: true, name: true, email: true, image: true } },
          payments: {
            orderBy: { installmentNumber: "asc" },
            include: {
              splits: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      });

      if (!result) {
        throw new Error("Failed to retrieve created installment");
      }

      return result;
    });
  }

  /**
   * Edit an installment.
   * If payments have already been marked as PAID, destructive structural changes
   * (e.g. changing totalInstallments or totalAmount) are blocked to protect financial history.
   */
  static async updateInstallment(
    installmentId: string,
    userId: string,
    input: UpdateInstallmentInput
  ): Promise<InstallmentWithDetails> {
    const existing = await this.getInstallmentById(installmentId, userId);
    if (!existing) {
      throw new Error("ไม่พบรายการผ่อนชำระ หรือไม่มีสิทธิ์เข้าถึง");
    }

    if (existing.ownerId !== userId) {
      throw new Error("เฉพาะเจ้าของรายการเท่านั้นที่มีสิทธิ์แก้ไขข้อมูล");
    }

    // Check if any payment is already paid
    const paidPayments = existing.payments.filter((p) => p.status === "PAID" || p.paidAt !== null);
    const hasPaidHistory = paidPayments.length > 0;

    // Check for destructive edits
    const isAmountChanged =
      input.totalAmount !== undefined &&
      !existing.totalAmount.equals(new Prisma.Decimal(input.totalAmount));
    const isInstallmentsChanged =
      input.totalInstallments !== undefined &&
      existing.totalInstallments !== input.totalInstallments;

    if (hasPaidHistory && (isAmountChanged || isInstallmentsChanged)) {
      throw new Error(
        `ไม่สามารถแก้ไขราคาเต็มหรือจำนวนงวดได้ เนื่องจากมีประวัติชำระเงินแล้ว ${paidPayments.length} งวด เพื่อรักษาความถูกต้องของประวัติการเงิน`
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.installment.update({
        where: { id: installmentId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.providerId ? { providerId: input.providerId } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(input.dueDay ? { dueDay: input.dueDay } : {}),
        },
        include: {
          provider: true,
          category: true,
          owner: { select: { id: true, name: true, email: true, image: true } },
          partner: { select: { id: true, name: true, email: true, image: true } },
          payments: {
            orderBy: { installmentNumber: "asc" },
            include: {
              splits: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      });

      return updated;
    });
  }

  /**
   * Delete an installment with strict protection:
   * Block deletion if any paid payment history exists.
   */
  static async deleteInstallment(
    installmentId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.getInstallmentById(installmentId, userId);
    if (!existing) {
      throw new Error("ไม่พบรายการผ่อนชำระ หรือไม่มีสิทธิ์เข้าถึง");
    }

    if (existing.ownerId !== userId) {
      throw new Error("เฉพาะเจ้าของรายการเท่านั้นที่มีสิทธิ์ลบรายการผ่อน");
    }

    const paidCount = existing.payments.filter(
      (p) => p.status === "PAID" || p.paidAt !== null
    ).length;

    if (paidCount > 0) {
      throw new Error(
        `ไม่สามารถลบรายการนี้ได้ เนื่องจากมีประวัติการชำระเงินแล้ว ${paidCount} งวด กรุณาเก็บบันทึกไว้เพื่อความถูกต้องของบัญชี`
      );
    }

    await prisma.installment.delete({
      where: { id: installmentId },
    });

    return { success: true, message: "ลบรายการผ่อนชำระเรียบร้อยแล้ว" };
  }

  /**
   * Mark a payment as PAID in the database.
   */
  static async markPaymentAsPaid(
    paymentId: string,
    userId: string,
    paidAtDate: Date = new Date(),
    note?: string
  ): Promise<PaymentWithSplits> {
    const payment = await prisma.installmentPayment.findUnique({
      where: { id: paymentId },
      include: {
        installment: true,
        splits: true,
      },
    });

    if (!payment) {
      throw new Error("ไม่พบงวดชำระเงินดังกล่าว");
    }

    // Authorization: User must be owner or partner of the installment
    if (
      payment.installment.ownerId !== userId &&
      payment.installment.partnerId !== userId
    ) {
      throw new Error("คุณไม่มีสิทธิ์ในการบันทึกการชำระเงินสำหรับรายการนี้");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update Payment status
      const updatedPayment = await tx.installmentPayment.update({
        where: { id: paymentId },
        data: {
          status: "PAID",
          paidAt: paidAtDate,
          payerId: userId,
          ...(note ? { note } : {}),
        },
        include: {
          splits: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      // 2. If shared payment has splits, mark the user's split or all as paid
      if (payment.splits.length > 0) {
        await tx.paymentSplit.updateMany({
          where: { paymentId },
          data: {
            status: "PAID",
            paidAt: paidAtDate,
            paidByUserId: userId,
          },
        });
      }

      // Check if all payments of the installment are now paid -> update installment status to COMPLETED
      const remainingUnpaid = await tx.installmentPayment.count({
        where: {
          installmentId: payment.installmentId,
          status: { not: "PAID" },
        },
      });

      if (remainingUnpaid === 0) {
        await tx.installment.update({
          where: { id: payment.installmentId },
          data: { status: "COMPLETED" },
        });
      }

      return updatedPayment;
    });
  }

  /**
   * Revert / Undo a paid payment back to pending status.
   */
  static async revertPaymentPaid(
    paymentId: string,
    userId: string
  ): Promise<PaymentWithSplits> {
    const payment = await prisma.installmentPayment.findUnique({
      where: { id: paymentId },
      include: {
        installment: true,
        splits: true,
      },
    });

    if (!payment) {
      throw new Error("ไม่พบงวดชำระเงินดังกล่าว");
    }

    // Authorization check
    if (
      payment.installment.ownerId !== userId &&
      payment.installment.partnerId !== userId
    ) {
      throw new Error("คุณไม่มีสิทธิ์ในการแก้ไขสถานะของรายการนี้");
    }

    // Determine initial status based on due date
    const initialStatus = determineInitialPaymentStatus(payment.dueDate);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.installmentPayment.update({
        where: { id: paymentId },
        data: {
          status: initialStatus,
          paidAt: null,
          payerId: null,
        },
        include: {
          splits: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      // Revert splits
      if (payment.splits.length > 0) {
        await tx.paymentSplit.updateMany({
          where: { paymentId },
          data: {
            status: initialStatus,
            paidAt: null,
            paidByUserId: null,
          },
        });
      }

      // Ensure installment is ACTIVE if previously COMPLETED
      if (payment.installment.status === "COMPLETED") {
        await tx.installment.update({
          where: { id: payment.installmentId },
          data: { status: "ACTIVE" },
        });
      }

      return updated;
    });
  }

  /**
   * Retrieve installments accessible by the authenticated user only.
   */
  static async getInstallments(
    userId: string,
    filters?: {
      ownershipType?: OwnershipType;
      status?: InstallmentStatus;
    }
  ): Promise<InstallmentWithDetails[]> {
    if (!userId) {
      throw new Error("Unauthorized: userId is required.");
    }

    const where: Prisma.InstallmentWhereInput = {
      OR: [{ ownerId: userId }, { partnerId: userId }],
      ...(filters?.ownershipType ? { ownershipType: filters.ownershipType } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    };

    return prisma.installment.findMany({
      where,
      include: {
        provider: true,
        category: true,
        owner: { select: { id: true, name: true, email: true, image: true } },
        partner: { select: { id: true, name: true, email: true, image: true } },
        payments: {
          orderBy: { installmentNumber: "asc" },
          include: {
            splits: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Retrieve single installment by ID with strict ownership check.
   */
  static async getInstallmentById(
    installmentId: string,
    userId: string
  ): Promise<InstallmentWithDetails | null> {
    if (!userId || !installmentId) {
      return null;
    }

    const item = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        provider: true,
        category: true,
        owner: { select: { id: true, name: true, email: true, image: true } },
        partner: { select: { id: true, name: true, email: true, image: true } },
        payments: {
          orderBy: { installmentNumber: "asc" },
          include: {
            splits: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!item) {
      return null;
    }

    if (item.ownerId !== userId && item.partnerId !== userId) {
      throw new Error("Forbidden: You do not have permission to access this installment.");
    }

    return item;
  }

  /**
   * Retrieve shared installments.
   */
  static async getSharedInstallments(userId: string): Promise<InstallmentWithDetails[]> {
    return this.getInstallments(userId, { ownershipType: "SHARED" });
  }

  /**
   * Retrieve payment schedule.
   */
  static async getPayments(
    installmentId: string,
    userId: string
  ): Promise<PaymentWithSplits[]> {
    const installment = await this.getInstallmentById(installmentId, userId);
    if (!installment) {
      throw new Error("Installment not found or unauthorized.");
    }

    return prisma.installmentPayment.findMany({
      where: { installmentId },
      include: {
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { installmentNumber: "asc" },
    });
  }
}
