import type { PaymentStatus, OwnershipType, InstallmentStatus, SettlementStatus } from "@prisma/client";

/**
 * มาตรฐานการแปลคำศัพท์สถานะและประเภทข้อมูลเป็นภาษาไทยที่อ่านง่ายและสื่อความหมายตรงกันทุกหน้า
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus | "PENDING", string> = {
  PAID: "ชำระแล้ว",
  UPCOMING: "ยังไม่ถึงกำหนด",
  DUE: "ถึงกำหนดชำระ",
  OVERDUE: "เกินกำหนด",
  PENDING: "รอดำเนินการ",
};

export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  PERSONAL: "ส่วนตัว",
  SHARED: "ผ่อนร่วม",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  ACTIVE: "กำลังผ่อน",
  COMPLETED: "ผ่อนครบแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  PENDING: "รอดำเนินการ",
  SETTLED: "เคลียร์แล้ว",
  CANCELLED: "ยกเลิกแล้ว",
};

/**
 * ดึงข้อความภาษาไทยของสถานะการชำระเงิน
 */
export function getPaymentStatusLabel(status: PaymentStatus | string | null | undefined): string {
  if (!status) return "";
  return PAYMENT_STATUS_LABELS[status as PaymentStatus] ?? status;
}

/**
 * ดึงข้อความภาษาไทยของรูปแบบเจ้าของรายการ
 */
export function getOwnershipLabel(type: OwnershipType | string | null | undefined): string {
  if (!type) return "";
  return OWNERSHIP_TYPE_LABELS[type as OwnershipType] ?? type;
}

/**
 * ดึงข้อความภาษาไทยของสถานะสัญญาผ่อน
 */
export function getInstallmentStatusLabel(status: InstallmentStatus | string | null | undefined): string {
  if (!status) return "";
  return INSTALLMENT_STATUS_LABELS[status as InstallmentStatus] ?? status;
}

/**
 * แปลงข้อความ splitDisplay ให้เป็นภาษาไทยที่เข้าใจง่าย เช่น
 * "PERSONAL" -> "ส่วนตัว"
 * "SHARED (50/50)" -> "ผ่อนร่วม (50/50)"
 * "SHARED (70/30)" -> "ผ่อนร่วม (70/30)"
 */
export function formatSplitDisplayThai(splitDisplay: string, ownershipType?: OwnershipType | string): string {
  if (ownershipType === "PERSONAL" || splitDisplay === "PERSONAL") {
    return "ส่วนตัว";
  }
  if (splitDisplay.startsWith("SHARED")) {
    const ratio = splitDisplay.replace("SHARED", "").trim();
    return ratio ? `ผ่อนร่วม ${ratio}` : "ผ่อนร่วม";
  }
  return splitDisplay;
}
