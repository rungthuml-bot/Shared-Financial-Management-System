"use client";

import * as React from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Loader2,
  Sparkles,
  Calculator,
  ChevronDown,
  SlidersHorizontal,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createInstallmentSchema,
  type CreateInstallmentInput,
} from "@/validators/installment";
import { createInstallmentAction } from "@/actions/installment.actions";
import { formatCurrency, cn } from "@/lib/utils";

interface FormDeps {
  providers: Array<{ id: string; name: string; slug: string }>;
  categories: Array<{ id: string; name: string; slug: string }>;
  partners: Array<{ id: string; name: string; email: string }>;
  currentUser?: { id: string; name: string; email: string };
}

interface CreateInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dependencies: FormDeps;
  onSuccess?: () => void;
}

/**
 * Live preview calculation matching canonical Decimal schedule generation logic
 */
function calculateLivePreview(
  totalAmount: number,
  downPayment: number,
  totalInstallments: number,
  ownershipType: "PERSONAL" | "SHARED",
  splitType: "NONE" | "EQUAL" | "PERCENTAGE",
  userSharePercent: number
) {
  const total = Number(totalAmount) || 0;
  const down = Number(downPayment) || 0;
  const installments = Math.max(1, Math.floor(Number(totalInstallments) || 1));
  const principal = Math.max(0, total - down);

  if (principal <= 0 || installments <= 0) {
    return null;
  }

  // Matches Decimal ROUND_DOWN to 2 decimal places exactly as in generateSchedule:
  const baseMonthly = Math.floor((principal / installments) * 100) / 100;
  const totalAllocated = Math.round(baseMonthly * installments * 100) / 100;
  const remainder = Math.round((principal - totalAllocated) * 100) / 100;
  const firstMonthAmount = Math.round((baseMonthly + remainder) * 100) / 100;

  // Split calculation matching canonical logic
  let userMonthlyShare = baseMonthly;
  let partnerMonthlyShare = 0;
  let firstUserMonthlyShare = firstMonthAmount;
  let firstPartnerMonthlyShare = 0;

  if (ownershipType === "SHARED") {
    if (splitType === "EQUAL") {
      userMonthlyShare = Math.round((baseMonthly / 2) * 100) / 100;
      partnerMonthlyShare = Math.round((baseMonthly - userMonthlyShare) * 100) / 100;
      firstUserMonthlyShare = Math.round((firstMonthAmount / 2) * 100) / 100;
      firstPartnerMonthlyShare = Math.round((firstMonthAmount - firstUserMonthlyShare) * 100) / 100;
    } else if (splitType === "PERCENTAGE") {
      const uPct = (Number(userSharePercent) || 0) / 100;
      userMonthlyShare = Math.round(baseMonthly * uPct * 100) / 100;
      partnerMonthlyShare = Math.round((baseMonthly - userMonthlyShare) * 100) / 100;
      firstUserMonthlyShare = Math.round(firstMonthAmount * uPct * 100) / 100;
      firstPartnerMonthlyShare = Math.round((firstMonthAmount - firstUserMonthlyShare) * 100) / 100;
    }
  }

  return {
    total,
    down,
    principal,
    installments,
    baseMonthly,
    remainder,
    firstMonthAmount,
    hasCentsRemainder: remainder > 0,
    userMonthlyShare,
    partnerMonthlyShare,
    firstUserMonthlyShare,
    firstPartnerMonthlyShare,
  };
}

export function CreateInstallmentDialog({
  open,
  onOpenChange,
  dependencies,
  onSuccess,
}: CreateInstallmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const defaultValues: Partial<CreateInstallmentInput> = {
    name: "",
    description: "",
    providerId: dependencies.providers[0]?.id ?? "",
    categoryId: "",
    totalAmount: 10000,
    downPayment: 0,
    totalInstallments: 10,
    dueDay: 5,
    startDate: new Date().toISOString().split("T")[0],
    ownershipType: "PERSONAL",
    splitType: "NONE",
    userSharePercent: 100,
    partnerSharePercent: 0,
    partnerId: dependencies.partners[0]?.id ?? "",
    note: "",
  };

  const form = useForm<CreateInstallmentInput>({
    resolver: zodResolver(createInstallmentSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = form;

  // Use useWatch for responsive form values without triggering compiler warnings
  const totalAmount = useWatch({ control, name: "totalAmount" }) ?? 0;
  const downPayment = useWatch({ control, name: "downPayment" }) ?? 0;
  const totalInstallments = useWatch({ control, name: "totalInstallments" }) ?? 1;
  const ownershipType = useWatch({ control, name: "ownershipType" }) ?? "PERSONAL";
  const splitType = useWatch({ control, name: "splitType" }) ?? "NONE";
  const userSharePercent = useWatch({ control, name: "userSharePercent" }) ?? 100;
  const partnerSharePercent = useWatch({ control, name: "partnerSharePercent" }) ?? 0;

  // Calculate live preview using canonical logic
  const preview = calculateLivePreview(
    totalAmount,
    downPayment,
    totalInstallments,
    ownershipType,
    splitType,
    userSharePercent
  );

  // Handle start date change and auto-sync dueDay from the selected date
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    setValue("startDate", dateVal, { shouldValidate: true });
    if (dateVal) {
      const parts = dateVal.split("-");
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        setValue("dueDay", day, { shouldValidate: true });
      }
    }
  };

  // Sync splitType and percentages when ownershipType changes
  const handleOwnershipChange = (type: "PERSONAL" | "SHARED") => {
    setValue("ownershipType", type, { shouldValidate: true });
    if (type === "PERSONAL") {
      setValue("splitType", "NONE", { shouldValidate: true });
      setValue("userSharePercent", 100, { shouldValidate: true });
      setValue("partnerSharePercent", 0, { shouldValidate: true });
    } else {
      setValue("splitType", "EQUAL", { shouldValidate: true });
      setValue("userSharePercent", 50, { shouldValidate: true });
      setValue("partnerSharePercent", 50, { shouldValidate: true });
      if (!form.getValues("partnerId") && dependencies.partners.length > 0) {
        setValue("partnerId", dependencies.partners[0].id, { shouldValidate: true });
      }
    }
  };

  const handleSplitTypeChange = (type: "EQUAL" | "PERCENTAGE") => {
    setValue("splitType", type, { shouldValidate: true });
    if (type === "EQUAL") {
      setValue("userSharePercent", 50, { shouldValidate: true });
      setValue("partnerSharePercent", 50, { shouldValidate: true });
    } else {
      setValue("userSharePercent", 70, { shouldValidate: true });
      setValue("partnerSharePercent", 30, { shouldValidate: true });
    }
  };

  const onError = (formErrors: FieldErrors<CreateInstallmentInput>) => {
    if (
      formErrors.downPayment ||
      formErrors.partnerSharePercent ||
      formErrors.partnerId ||
      formErrors.description ||
      formErrors.note
    ) {
      setAdvancedOpen(true);
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setAdvancedOpen(false);
      reset(defaultValues);
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: CreateInstallmentInput) => {
    setIsSubmitting(true);
    try {
      const res = await createInstallmentAction(data);
      if (res.success) {
        toast.success(res.message || "สร้างรายการผ่อนสำเร็จ");
        reset(defaultValues);
        setAdvancedOpen(false);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "ไม่สามารถสร้างรายการผ่อนได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Plus className="h-5 w-5 text-primary shrink-0" />
            <span>สร้างรายการผ่อนชำระใหม่</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            กรอกข้อมูลรายการผ่อน ระบบจะคำนวณค่างวดและสร้างตารางชำระเงินให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4 pt-2">
          {/* ======================================================== */}
          {/* SECTION 1: ข้อมูลหลักที่จำเป็น (Always Visible) */}
          {/* ======================================================== */}
          <div className="space-y-3.5">
            {/* 1. ชื่อรายการ */}
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-foreground">
                ชื่อรายการ *
              </Label>
              <Input
                id="name"
                placeholder="เช่น iPad Air, ตู้เย็น, ซื้อของ Shopee"
                className="h-10 text-sm"
                {...register("name")}
              />
              <p className="text-[11px] text-muted-foreground">
                ระบุชื่อสินค้าหรือบริการที่ผ่อนชำระ
              </p>
              {errors.name && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* 2. ร้านค้าหรือผู้ให้บริการ */}
            <div className="space-y-1">
              <Label htmlFor="providerId" className="text-xs sm:text-sm font-semibold text-foreground">
                ร้านค้าหรือผู้ให้บริการ *
              </Label>
              <select
                id="providerId"
                {...register("providerId")}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {dependencies.providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                เลือกบัตรเครดิต หรือแอปพลิเคชันที่ใช้ผ่อนชำระ
              </p>
              {errors.providerId && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.providerId.message}
                </p>
              )}
            </div>

            {/* 3. ยอดซื้อทั้งหมด & 4. จำนวนงวด */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="totalAmount" className="text-xs sm:text-sm font-semibold text-foreground">
                  ยอดซื้อทั้งหมด (บาท) *
                </Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="เช่น 15000"
                  className="h-10 text-sm"
                  {...register("totalAmount", { valueAsNumber: true })}
                />
                <p className="text-[11px] text-muted-foreground">
                  ยอดรวมที่ต้องผ่อนชำระทั้งหมด
                </p>
                {errors.totalAmount && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.totalAmount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="totalInstallments" className="text-xs sm:text-sm font-semibold text-foreground">
                  ผ่อนกี่งวด *
                </Label>
                <Input
                  id="totalInstallments"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="เช่น 10"
                  className="h-10 text-sm"
                  {...register("totalInstallments", { valueAsNumber: true })}
                />
                <p className="text-[11px] text-muted-foreground">
                  จำนวนงวดชำระ (เช่น 3, 6, 10, 12, 24 งวด)
                </p>
                {errors.totalInstallments && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.totalInstallments.message}
                  </p>
                )}
              </div>
            </div>

            {/* 5. วันที่เกี่ยวข้องกับการผ่อน */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="startDate" className="text-xs sm:text-sm font-semibold text-foreground">
                  วันครบกำหนดงวดแรก *
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  className="h-10 text-sm"
                  {...register("startDate")}
                  onChange={handleStartDateChange}
                />
                <p className="text-[11px] text-muted-foreground">
                  วันที่ครบกำหนดชำระงวดที่ 1
                </p>
                {errors.startDate && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="dueDay" className="text-xs sm:text-sm font-semibold text-foreground">
                  จ่ายทุกวันที่เท่าไรของเดือน *
                </Label>
                <Input
                  id="dueDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="เช่น 5"
                  className="h-10 text-sm"
                  {...register("dueDay", { valueAsNumber: true })}
                />
                <p className="text-[11px] text-muted-foreground">
                  วันที่ครบกำหนดชำระในแต่ละเดือน (1-31)
                </p>
                {errors.dueDay && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.dueDay.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: ตั้งค่าเพิ่มเติม (Collapsible, Collapsed by Default) */}
          {/* ======================================================== */}
          <div className="border-t border-border/70 pt-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl p-3 text-xs font-semibold transition-all cursor-pointer border",
                advancedOpen
                  ? "bg-muted/80 text-foreground border-primary/40 shadow-2xs"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground border-dashed border-border"
              )}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span>ตั้งค่าเพิ่มเติม (ไม่จำเป็นสำหรับทุกรายการ)</span>
                {ownershipType === "SHARED" && (
                  <Badge variant="shared" className="text-[10px] py-0 h-4">
                    ผ่อนร่วม
                  </Badge>
                )}
                {downPayment > 0 && (
                  <Badge variant="outline" className="text-[10px] py-0 h-4">
                    มีดาวน์
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  advancedOpen && "rotate-180 text-primary"
                )}
              />
            </button>

            {advancedOpen && (
              <div className="space-y-4 pt-3.5 animate-in fade-in-50 duration-200">
                {/* 1. เงินดาวน์ & หมวดหมู่ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="downPayment" className="text-xs sm:text-sm font-semibold text-foreground">
                      เงินดาวน์ (บาท)
                    </Label>
                    <Input
                      id="downPayment"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="เช่น 0"
                      className="h-10 text-sm"
                      {...register("downPayment", { valueAsNumber: true })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      หากจ่ายเงินดาวน์ไปแล้ว ให้ระบุที่นี่ (หากไม่มีให้เว้นไว้เป็น 0)
                    </p>
                    {errors.downPayment && (
                      <p className="text-[11px] text-destructive font-medium">
                        {errors.downPayment.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="categoryId" className="text-xs sm:text-sm font-semibold text-foreground">
                      หมวดหมู่ค่าใช้จ่าย
                    </Label>
                    <select
                      id="categoryId"
                      {...register("categoryId")}
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="">ไม่ระบุหมวดหมู่</option>
                      {dependencies.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      จัดกลุ่มเพื่อดูสถิติในหน้ารายงาน
                    </p>
                  </div>
                </div>

                {/* 2. รูปแบบการผ่อน: ส่วนตัว หรือ ผ่อนร่วม */}
                <div className="space-y-2.5">
                  <Label className="text-xs sm:text-sm font-semibold text-foreground">
                    รูปแบบการผ่อนชำระ
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOwnershipChange("PERSONAL")}
                      className={cn(
                        "p-3 rounded-xl border text-left cursor-pointer transition-all",
                        ownershipType === "PERSONAL"
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-bold shadow-2xs"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <div className="text-xs sm:text-sm font-semibold">
                        ผ่อนส่วนตัว (Personal 100%)
                      </div>
                      <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                        รับผิดชอบยอดคนเดียวเต็มจำนวน
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOwnershipChange("SHARED")}
                      className={cn(
                        "p-3 rounded-xl border text-left cursor-pointer transition-all",
                        ownershipType === "SHARED"
                          ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20 text-violet-600 dark:text-violet-400 font-bold shadow-2xs"
                          : "border-border bg-card text-muted-foreground hover:border-violet-500/40"
                      )}
                    >
                      <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                        <Users2 className="h-3.5 w-3.5" />
                        <span>ผ่อนร่วม (Shared 2 คน)</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                        หารยอดกับคู่แชร์ และนำไปคำนวณยอดเคลียร์
                      </div>
                    </button>
                  </div>

                  {/* Shared Sub-settings */}
                  {ownershipType === "SHARED" && (
                    <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-3 animate-in fade-in-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          สัดส่วนการแบ่งจ่าย
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSplitTypeChange("EQUAL")}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors",
                              splitType === "EQUAL"
                                ? "bg-violet-600 text-white font-semibold"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            คนละครึ่ง (50/50)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSplitTypeChange("PERCENTAGE")}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors",
                              splitType === "PERCENTAGE"
                                ? "bg-violet-600 text-white font-semibold"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            กำหนด % เอง
                          </button>
                        </div>
                      </div>

                      {/* Partner Select */}
                      <div className="space-y-1">
                        <Label htmlFor="partnerId" className="text-xs font-semibold text-foreground">
                          เลือกคู่แชร์ *
                        </Label>
                        <select
                          id="partnerId"
                          {...register("partnerId")}
                          className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                        >
                          {dependencies.partners.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.name} ({pt.email})
                            </option>
                          ))}
                        </select>
                        {errors.partnerId && (
                          <p className="text-[11px] text-destructive font-medium">
                            {errors.partnerId.message}
                          </p>
                        )}
                      </div>

                      {/* Custom Percentage inputs */}
                      {splitType === "PERCENTAGE" && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <Label htmlFor="userSharePercent" className="text-xs font-semibold text-foreground">
                              สัดส่วนของคุณ (%)
                            </Label>
                            <Input
                              id="userSharePercent"
                              type="number"
                              min="0"
                              max="100"
                              className="h-9 text-sm"
                              {...register("userSharePercent", {
                                valueAsNumber: true,
                                onChange: (e) => {
                                  const val = Number(e.target.value) || 0;
                                  setValue("partnerSharePercent", Math.max(0, 100 - val), {
                                    shouldValidate: true,
                                  });
                                },
                              })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="partnerSharePercent" className="text-xs font-semibold text-foreground">
                              สัดส่วนคู่แชร์ (%)
                            </Label>
                            <Input
                              id="partnerSharePercent"
                              type="number"
                              min="0"
                              max="100"
                              className="h-9 text-sm"
                              {...register("partnerSharePercent", {
                                valueAsNumber: true,
                                onChange: (e) => {
                                  const val = Number(e.target.value) || 0;
                                  setValue("userSharePercent", Math.max(0, 100 - val), {
                                    shouldValidate: true,
                                  });
                                },
                              })}
                            />
                          </div>
                        </div>
                      )}
                      {errors.partnerSharePercent && (
                        <p className="text-[11px] text-destructive font-medium">
                          {errors.partnerSharePercent.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. รายละเอียดเพิ่มเติม & หมายเหตุ */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="description" className="text-xs sm:text-sm font-semibold text-foreground">
                      รายละเอียดสินค้า / รุ่น
                    </Label>
                    <Input
                      id="description"
                      placeholder="เช่น สี Space Gray 256GB Wi-Fi"
                      className="h-10 text-sm"
                      {...register("description")}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="note" className="text-xs sm:text-sm font-semibold text-foreground">
                      หมายเหตุเพิ่มเติม
                    </Label>
                    <Textarea
                      id="note"
                      rows={2}
                      placeholder="เช่น โปร 0% 10 เดือน, สัญญาผ่อนเลขที่..."
                      className="text-sm"
                      {...register("note")}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: สรุปข้อมูลรายการ (Live Summary & Preview) */}
          {/* ======================================================== */}
          {preview && (
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span>สรุปการคำนวณค่างวด</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  คำนวณตามสูตรจริงของระบบ
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-card border border-border/70">
                  <span className="text-muted-foreground block text-[11px]">ยอดซื้อเต็ม</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(preview.total)}
                  </span>
                </div>

                {preview.down > 0 && (
                  <div className="p-2.5 rounded-xl bg-card border border-border/70">
                    <span className="text-muted-foreground block text-[11px]">เงินดาวน์</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(preview.down)}
                    </span>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-card border border-border/70">
                  <span className="text-muted-foreground block text-[11px]">จำนวนงวด</span>
                  <span className="font-bold text-foreground">
                    {preview.installments} งวด
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-card border border-primary/30 col-span-2 sm:col-span-1">
                  <span className="text-muted-foreground block text-[11px]">ยอดผ่อนต่องวด</span>
                  <span className="text-sm font-extrabold text-primary block leading-tight">
                    {formatCurrency(preview.baseMonthly)}
                  </span>
                  {preview.hasCentsRemainder && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      งวดที่ 1: {formatCurrency(preview.firstMonthAmount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Shared breakdown */}
              {ownershipType === "SHARED" && (
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-medium">
                    <Users2 className="h-3.5 w-3.5 shrink-0" />
                    <span>ส่วนของคุณ ({userSharePercent}%):</span>
                    <strong className="font-bold">
                      {formatCurrency(preview.userMonthlyShare)}/งวด
                    </strong>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    คู่แชร์ ({partnerSharePercent}%):{" "}
                    <strong className="text-foreground">
                      {formatCurrency(preview.partnerMonthlyShare)}/งวด
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: ปุ่มบันทึกและยกเลิก (Actions) */}
          {/* ======================================================== */}
          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังสร้างรายการและตารางงวด...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>บันทึกรายการ</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
