import { z } from "zod";

export const createInstallmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "ชื่อรายการต้องมีอย่างน้อย 2 ตัวอักษร")
      .max(100, "ชื่อรายการยาวเกินไป"),
    description: z.string().trim().max(300, "รายละเอียดต้องไม่เกิน 300 ตัวอักษร").optional(),
    providerId: z.string().min(1, "กรุณาเลือกผู้ให้บริการ"),
    categoryId: z.string().optional(),
    totalAmount: z
      .number()
      .positive("ราคาเต็มต้องมากกว่า 0")
      .max(10_000_000, "ยอดเงินสูงสุดไม่เกิน 10,000,000 บาท"),
    downPayment: z
      .number()
      .nonnegative("เงินดาวน์ต้องไม่ติดลบ"),
    totalInstallments: z
      .number()
      .int("จำนวนงวดต้องเป็นจำนวนเต็ม")
      .min(1, "จำนวนงวดต้องอย่างน้อย 1 งวด")
      .max(120, "จำนวนงวดสูงสุดไม่เกิน 120 งวด"),
    dueDay: z
      .number()
      .int("วันครบกำหนดต้องเป็นจำนวนเต็ม")
      .min(1, "วันครบกำหนดต้องอยู่ระหว่างวันที่ 1-31")
      .max(31, "วันครบกำหนดต้องอยู่ระหว่างวันที่ 1-31"),
    startDate: z.string().min(1, "กรุณาระบุวันที่เริ่มผ่อน"),
    ownershipType: z.enum(["PERSONAL", "SHARED"]),
    splitType: z.enum(["NONE", "EQUAL", "PERCENTAGE"]),
    userSharePercent: z.number().min(0).max(100),
    partnerSharePercent: z.number().min(0).max(100),
    partnerId: z.string().optional(),
    note: z.string().max(500, "หมายเหตุต้องไม่เกิน 500 ตัวอักษร").optional(),
  })
  .refine(
    (data) => {
      // Down payment cannot exceed total amount
      return data.downPayment < data.totalAmount;
    },
    {
      message: "เงินดาวน์ต้องน้อยกว่าราคาเต็มของรายการ",
      path: ["downPayment"],
    }
  )
  .refine(
    (data) => {
      if (data.ownershipType === "SHARED") {
        if (data.splitType === "NONE") {
          return false;
        }
        if (data.splitType === "EQUAL") {
          return true;
        }
        if (data.splitType === "PERCENTAGE") {
          return Math.abs(data.userSharePercent + data.partnerSharePercent - 100) < 0.01;
        }
      }
      return true;
    },
    {
      message: "รายการผ่อนร่วมต้องเลือกรูปแบบการแบ่งจ่าย (50/50 หรือกำหนดเปอร์เซ็นต์รวม 100%)",
      path: ["partnerSharePercent"],
    }
  );

export type CreateInstallmentInput = z.infer<typeof createInstallmentSchema>;

export const markPaymentPaidSchema = z.object({
  paymentId: z.string().min(1, "รหัสงวดชำระไม่ถูกต้อง"),
  paidAt: z.string().optional(),
  payerId: z.string().optional(),
  note: z.string().max(250).optional(),
});

export type MarkPaymentPaidInput = z.infer<typeof markPaymentPaidSchema>;
