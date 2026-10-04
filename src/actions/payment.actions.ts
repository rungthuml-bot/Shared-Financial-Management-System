"use server";

import { revalidatePath } from "next/cache";
import { requireAuthUser } from "@/lib/session";
import { InstallmentService } from "@/services/installment.service";
import type { ActionResult } from "./installment.actions";

/**
 * Server Action: Mark an installment payment as PAID
 */
export async function markPaymentAsPaidAction(
  paymentId: string,
  paidAtDateString?: string,
  note?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuthUser();

    if (!paymentId) {
      return { success: false, error: "ระบุงวดชำระไม่ถูกต้อง" };
    }

    const paidAt = paidAtDateString ? new Date(paidAtDateString) : new Date();
    const updated = await InstallmentService.markPaymentAsPaid(paymentId, user.id, paidAt, note);

    revalidatePath("/installments");
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/shared");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
      message: "บันทึกการชำระเงินเรียบร้อยแล้ว",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกชำระเงิน";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Revert / Undo a paid payment status back to pending
 */
export async function revertPaymentPaidAction(paymentId: string): Promise<ActionResult> {
  try {
    const user = await requireAuthUser();

    if (!paymentId) {
      return { success: false, error: "ระบุงวดชำระไม่ถูกต้อง" };
    }

    const updated = await InstallmentService.revertPaymentPaid(paymentId, user.id);

    revalidatePath("/installments");
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/shared");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
      message: "ยกเลิกสถานะชำระเงินเรียบร้อยแล้ว",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการยกเลิกสถานะชำระเงิน";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Retrieve full payment schedule for an installment
 */
export async function getInstallmentPaymentsAction(installmentId: string): Promise<ActionResult> {
  try {
    const user = await requireAuthUser();

    if (!installmentId) {
      return { success: false, error: "ระบุรหัสรายการผ่อนไม่ถูกต้อง" };
    }

    const payments = await InstallmentService.getPayments(installmentId, user.id);
    return { success: true, data: JSON.parse(JSON.stringify(payments)) };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลตารางงวดได้";
    return { success: false, error: msg };
  }
}
