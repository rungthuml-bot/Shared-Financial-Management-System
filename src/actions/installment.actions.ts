"use server";

import { revalidatePath } from "next/cache";
import { requireAuthUser } from "@/lib/session";
import { InstallmentService, type UpdateInstallmentInput } from "@/services/installment.service";
import { createInstallmentSchema, type CreateInstallmentInput } from "@/validators/installment";
import type { OwnershipType, InstallmentStatus } from "@prisma/client";

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/**
 * Server Action: Create an Installment with automatic Schedule & Splits
 */
export async function createInstallmentAction(
  rawInput: CreateInstallmentInput
): Promise<ActionResult> {
  try {
    const user = await requireAuthUser();

    // Validate with Zod
    const validation = createInstallmentSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
      return { success: false, error: firstError };
    }

    const created = await InstallmentService.createInstallment(user.id, validation.data);

    revalidatePath("/installments");
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/shared");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(created)),
      message: "สร้างรายการผ่อนชำระและตารางงวดเรียบร้อยแล้ว",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างรายการผ่อน";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Update Installment details with safety checks
 */
export async function updateInstallmentAction(
  installmentId: string,
  rawInput: UpdateInstallmentInput
): Promise<ActionResult> {
  try {
    const user = await requireAuthUser();

    if (!installmentId) {
      return { success: false, error: "ระบุรหัสรายการผ่อนไม่ถูกต้อง" };
    }

    const updated = await InstallmentService.updateInstallment(installmentId, user.id, rawInput);

    revalidatePath("/installments");
    revalidatePath("/");
    revalidatePath("/calendar");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
      message: "แก้ไขข้อมูลรายการผ่อนเรียบร้อยแล้ว",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการแก้ไขข้อมูล";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Delete Installment with paid history protection
 */
export async function deleteInstallmentAction(installmentId: string): Promise<ActionResult> {
  try {
    const user = await requireAuthUser();

    if (!installmentId) {
      return { success: false, error: "ระบุรหัสรายการผ่อนไม่ถูกต้อง" };
    }

    const res = await InstallmentService.deleteInstallment(installmentId, user.id);

    revalidatePath("/installments");
    revalidatePath("/");
    revalidatePath("/calendar");
    revalidatePath("/shared");

    return {
      success: true,
      data: null,
      message: res.message,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบรายการ";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Fetch user-authorized installments
 */
export async function getInstallmentsAction(filters?: {
  ownershipType?: OwnershipType;
  status?: InstallmentStatus;
}): Promise<ActionResult> {
  try {
    const user = await requireAuthUser();
    const data = await InstallmentService.getInstallments(user.id, filters);
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลรายการผ่อนได้";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Fetch form dependencies (providers, categories, partners)
 */
export async function getFormDependenciesAction(): Promise<ActionResult> {
  try {
    const user = await requireAuthUser();
    const [providers, categories, partners] = await Promise.all([
      InstallmentService.getProviders(),
      InstallmentService.getCategories(),
      InstallmentService.getPotentialPartners(user.id),
    ]);

    return {
      success: true,
      data: {
        providers,
        categories,
        partners,
        currentUser: user,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลตัวเลือกได้";
    return { success: false, error: msg };
  }
}
