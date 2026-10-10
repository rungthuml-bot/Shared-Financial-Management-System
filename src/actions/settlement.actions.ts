"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import { DashboardService, type DashboardNetSettlement } from "@/services/dashboard.service";
import { InstallmentService } from "@/services/installment.service";
import type { InstallmentWithDetails } from "@/types/installment";
import type { ActionResult } from "./installment.actions";

export interface SettlementHistoryItem {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  status: string;
  note: string | null;
  settledAt: string | null;
  createdAt: string;
}

export interface SharedPageData {
  currentUserId: string;
  currentUserName: string;
  netSettlement: DashboardNetSettlement;
  sharedInstallments: InstallmentWithDetails[];
  settlementHistory: SettlementHistoryItem[];
}

/**
 * Server Action: Retrieve authenticated shared installment data,
 * canonical net settlement calculation, and settlement history.
 */
export async function getSharedPageDataAction(): Promise<ActionResult<SharedPageData>> {
  try {
    const user = await requireAuthUser();

    const [netSettlement, sharedInstallmentsRaw, settlements] = await Promise.all([
      DashboardService.calculateNetSettlement(user.id),
      InstallmentService.getInstallments(user.id, { ownershipType: "SHARED" }),
      prisma.settlement.findMany({
        where: {
          OR: [{ fromUserId: user.id }, { toUserId: user.id }],
          status: "SETTLED",
        },
        orderBy: { settledAt: "desc" },
        take: 10,
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
      }),
    ]);

    const settlementHistory: SettlementHistoryItem[] = settlements.map((s) => ({
      id: s.id,
      fromUserId: s.fromUserId,
      fromUserName: s.fromUser?.name || "ไม่ระบุชื่อ",
      toUserId: s.toUserId,
      toUserName: s.toUser?.name || "ไม่ระบุชื่อ",
      amount: new Prisma.Decimal(s.amount).toNumber(),
      status: s.status,
      note: s.note,
      settledAt: s.settledAt ? s.settledAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        currentUserId: user.id,
        currentUserName: user.name,
        netSettlement,
        sharedInstallments: JSON.parse(JSON.stringify(sharedInstallmentsRaw)),
        settlementHistory,
      },
    };
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "เกิดข้อผิดพลาดในการโหลดข้อมูลรายการผ่อนร่วม";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Safely record an atomic settlement between the authenticated user
 * and their partner based on the canonical net settlement calculation.
 */
export async function recordSettlementAction(input?: {
  note?: string;
}): Promise<ActionResult<{ settlementId: string; amount: number }>> {
  try {
    const user = await requireAuthUser();

    // 1. Derive current net settlement on the server from authoritative database state
    const netSettlement = await DashboardService.calculateNetSettlement(user.id);

    // 2. Domain guard validations
    if (
      netSettlement.netAmount <= 0 ||
      netSettlement.direction === "none" ||
      netSettlement.direction === "settled"
    ) {
      return {
        success: false,
        error: "ไม่มียอดคงค้างที่ต้องเคลียร์ (ยอดสุทธิ ฿0)",
      };
    }

    if (!netSettlement.partnerId) {
      return {
        success: false,
        error: "ไม่พบคู่แชร์ที่เกี่ยวข้องในการเคลียร์ยอด",
      };
    }

    const partnerId = netSettlement.partnerId;
    const amount = netSettlement.netAmount;

    // Payer is the debtor; receiver is the creditor
    const fromUserId = netSettlement.direction === "you_owe" ? user.id : partnerId;
    const toUserId = netSettlement.direction === "you_owe" ? partnerId : user.id;

    // 3. Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // A. Query existing pending settlements between these two users
      const pendingSettlements = await tx.settlement.findMany({
        where: {
          status: "PENDING",
          OR: [
            { fromUserId: user.id, toUserId: partnerId },
            { fromUserId: partnerId, toUserId: user.id },
          ],
        },
      });

      // Mark all pending settlements between them as SETTLED
      if (pendingSettlements.length > 0) {
        await tx.settlement.updateMany({
          where: {
            id: { in: pendingSettlements.map((s) => s.id) },
          },
          data: {
            status: "SETTLED",
            settledAt: now,
          },
        });
      }

      // B. Update any unpaid splits on paid shared installment payments between them
      const sharedInsts = await tx.installment.findMany({
        where: {
          ownershipType: "SHARED",
          OR: [
            { ownerId: user.id, partnerId: partnerId },
            { ownerId: partnerId, partnerId: user.id },
          ],
        },
        select: { id: true },
      });

      if (sharedInsts.length > 0) {
        const sharedInstIds = sharedInsts.map((i) => i.id);
        const paidPayments = await tx.installmentPayment.findMany({
          where: {
            installmentId: { in: sharedInstIds },
            status: "PAID",
          },
          select: { id: true },
        });

        if (paidPayments.length > 0) {
          const paidPaymentIds = paidPayments.map((p) => p.id);
          await tx.paymentSplit.updateMany({
            where: {
              paymentId: { in: paidPaymentIds },
              status: { not: "PAID" },
            },
            data: {
              status: "PAID",
              paidAt: now,
              paidByUserId: fromUserId,
            },
          });
        }
      }

      // C. Account for pending records to prevent duplicate amount recording
      const pendingSettledSum = pendingSettlements.reduce((sum, s) => {
        if (s.fromUserId === fromUserId && s.toUserId === toUserId) {
          return sum.plus(new Prisma.Decimal(s.amount));
        } else if (s.fromUserId === toUserId && s.toUserId === fromUserId) {
          return sum.minus(new Prisma.Decimal(s.amount));
        }
        return sum;
      }, new Prisma.Decimal(0));

      const delta = new Prisma.Decimal(amount).minus(pendingSettledSum);

      let recordId: string;

      if (delta.greaterThan(0)) {
        // Create settlement record for remaining delta
        const created = await tx.settlement.create({
          data: {
            fromUserId,
            toUserId,
            amount: delta,
            status: "SETTLED",
            settledAt: now,
            note: input?.note?.trim() || "บันทึกเคลียร์ยอดระหว่างกันเรียบร้อย",
          },
        });
        recordId = created.id;
      } else if (pendingSettlements.length > 0) {
        recordId = pendingSettlements[0].id;
        if (input?.note?.trim()) {
          await tx.settlement.update({
            where: { id: recordId },
            data: { note: input.note.trim() },
          });
        }
      } else {
        const created = await tx.settlement.create({
          data: {
            fromUserId,
            toUserId,
            amount: new Prisma.Decimal(amount),
            status: "SETTLED",
            settledAt: now,
            note: input?.note?.trim() || "บันทึกเคลียร์ยอดระหว่างกันเรียบร้อย",
          },
        });
        recordId = created.id;
      }

      // D. Create In-App Notification for the other participant (partnerId)
      // Only the other participant is notified; creator is not notified.
      // Committed within the same atomic transaction.
      await tx.notification.create({
        data: {
          userId: partnerId,
          type: "SETTLEMENT",
          title: "บันทึกเคลียร์ยอดสำเร็จ",
          message: `${user.name} ได้บันทึกการเคลียร์ยอดจำนวน ฿${amount.toLocaleString()} เรียบร้อยแล้ว`,
        },
      });

      return {
        settlementId: recordId,
        amount,
      };
    });

    try {
      revalidatePath("/shared");
      revalidatePath("/");
      revalidatePath("/reports");
    } catch {
      // In standalone test environments, static generation store is unavailable
    }

    return {
      success: true,
      data: result,
      message: `บันทึกการเคลียร์ยอด ฿${amount.toLocaleString()} เรียบร้อยแล้ว`,
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกเคลียร์ยอด";
    return { success: false, error: msg };
  }
}
