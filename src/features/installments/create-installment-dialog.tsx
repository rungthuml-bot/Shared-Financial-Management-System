"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2, Sparkles, Calculator } from "lucide-react";
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
import {
  createInstallmentSchema,
  type CreateInstallmentInput,
} from "@/validators/installment";
import { createInstallmentAction } from "@/actions/installment.actions";
import { formatCurrency } from "@/lib/utils";

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

export function CreateInstallmentDialog({
  open,
  onOpenChange,
  dependencies,
  onSuccess,
}: CreateInstallmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultValues: Partial<CreateInstallmentInput> = {
    name: "",
    description: "",
    providerId: dependencies.providers[0]?.id ?? "",
    categoryId: dependencies.categories[0]?.id ?? "",
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
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form;

  const totalAmount = watch("totalAmount") || 0;
  const downPayment = watch("downPayment") || 0;
  const totalInstallments = watch("totalInstallments") || 1;
  const ownershipType = watch("ownershipType");
  const splitType = watch("splitType");
  const userSharePercent = watch("userSharePercent") || 0;
  const partnerSharePercent = watch("partnerSharePercent") || 0;

  // Real-time calculation preview
  const remainingPrincipal = Math.max(0, totalAmount - downPayment);
  const monthlyAmount =
    totalInstallments > 0
      ? Math.round((remainingPrincipal / totalInstallments) * 100) / 100
      : 0;

  const myMonthlyShare =
    ownershipType === "PERSONAL"
      ? monthlyAmount
      : splitType === "EQUAL"
      ? Math.round((monthlyAmount / 2) * 100) / 100
      : Math.round(monthlyAmount * (userSharePercent / 100) * 100) / 100;

  const partnerMonthlyShare = monthlyAmount - myMonthlyShare;

  // Sync splitType and percentages when ownershipType changes
  const handleOwnershipChange = (type: "PERSONAL" | "SHARED") => {
    setValue("ownershipType", type);
    if (type === "PERSONAL") {
      setValue("splitType", "NONE");
      setValue("userSharePercent", 100);
      setValue("partnerSharePercent", 0);
    } else {
      setValue("splitType", "EQUAL");
      setValue("userSharePercent", 50);
      setValue("partnerSharePercent", 50);
      if (!form.getValues("partnerId") && dependencies.partners.length > 0) {
        setValue("partnerId", dependencies.partners[0].id);
      }
    }
  };

  const handleSplitTypeChange = (type: "EQUAL" | "PERCENTAGE") => {
    setValue("splitType", type);
    if (type === "EQUAL") {
      setValue("userSharePercent", 50);
      setValue("partnerSharePercent", 50);
    } else {
      setValue("userSharePercent", 70);
      setValue("partnerSharePercent", 30);
    }
  };

  const onSubmit = async (data: CreateInstallmentInput) => {
    setIsSubmitting(true);
    try {
      const res = await createInstallmentAction(data);
      if (res.success) {
        toast.success(res.message || "สร้างรายการผ่อนสำเร็จ");
        reset();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>สร้างรายการผ่อนชำระใหม่</span>
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลรายการผ่อน ระบบจะคำนวณค่างวดและสร้างตารางชำระเงินให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Section 1: Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="name">ชื่อรายการผ่อน *</Label>
              <Input
                id="name"
                placeholder="เช่น iPhone 16 Pro Max, เครื่องดูดฝุ่น Dyson"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="providerId">ผู้ให้บริการ *</Label>
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
              {errors.providerId && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.providerId.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="categoryId">หมวดหมู่</Label>
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
            </div>
          </div>

          {/* Section 2: Financial Numbers */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calculator className="h-4 w-4 text-primary" />
              <span>ข้อมูลการเงินและจำนวนงวด</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="totalAmount">ราคาเต็ม (บาท) *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  min="1"
                  {...register("totalAmount", { valueAsNumber: true })}
                />
                {errors.totalAmount && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.totalAmount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="downPayment">เงินดาวน์ (บาท)</Label>
                <Input
                  id="downPayment"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("downPayment", { valueAsNumber: true })}
                />
                {errors.downPayment && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.downPayment.message}
                  </p>
                )}
              </div>

              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label htmlFor="totalInstallments">จำนวนงวด (งวด) *</Label>
                <Input
                  id="totalInstallments"
                  type="number"
                  min="1"
                  max="120"
                  {...register("totalInstallments", { valueAsNumber: true })}
                />
                {errors.totalInstallments && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.totalInstallments.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="startDate">วันที่เริ่มผ่อน *</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="dueDay">วันครบกำหนด (1-31) *</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="เช่น 5"
                  {...register("dueDay", { valueAsNumber: true })}
                />
                {errors.dueDay && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.dueDay.message}
                  </p>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-card border border-border flex flex-col justify-center">
                <span className="text-[11px] text-muted-foreground block">
                  คำนวณค่างวดต่อเดือน
                </span>
                <span className="text-base font-bold text-primary">
                  {formatCurrency(monthlyAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Ownership and Split Options */}
          <div className="space-y-3">
            <Label>รูปแบบเจ้าของรายการ (Ownership)</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOwnershipChange("PERSONAL")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  ownershipType === "PERSONAL"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-bold"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                <div className="text-xs sm:text-sm font-semibold">
                  ส่วนตัว (Personal 100%)
                </div>
                <div className="text-[11px] text-muted-foreground font-normal">
                  รับผิดชอบคนเดียวเต็มจำนวน
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOwnershipChange("SHARED")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  ownershipType === "SHARED"
                    ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20 text-violet-600 dark:text-violet-400 font-bold"
                    : "border-border bg-card text-muted-foreground hover:border-violet-500/40"
                }`}
              >
                <div className="text-xs sm:text-sm font-semibold">
                  ผ่อนร่วม (Shared 2 คน)
                </div>
                <div className="text-[11px] text-muted-foreground font-normal">
                  แชร์ค่าใช้จ่ายและคำนวณยอดเคลียร์
                </div>
              </button>
            </div>

            {/* Shared Sub-settings */}
            {ownershipType === "SHARED" && (
              <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-3 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    การแบ่งสัดส่วนการชำระเงิน
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSplitTypeChange("EQUAL")}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
                        splitType === "EQUAL"
                          ? "bg-violet-600 text-white font-semibold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      50 / 50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSplitTypeChange("PERCENTAGE")}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
                        splitType === "PERCENTAGE"
                          ? "bg-violet-600 text-white font-semibold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      กำหนด % เอง
                    </button>
                  </div>
                </div>

                {/* Partner Select */}
                <div className="space-y-1">
                  <Label htmlFor="partnerId">เลือกคู่แชร์ *</Label>
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
                </div>

                {/* Custom Percentage inputs */}
                {splitType === "PERCENTAGE" && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="userSharePercent">สัดส่วนของฉัน (%)</Label>
                      <Input
                        id="userSharePercent"
                        type="number"
                        min="0"
                        max="100"
                        {...register("userSharePercent", {
                          valueAsNumber: true,
                          onChange: (e) => {
                            const val = Number(e.target.value) || 0;
                            setValue("partnerSharePercent", Math.max(0, 100 - val));
                          },
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="partnerSharePercent">สัดส่วนคู่แชร์ (%)</Label>
                      <Input
                        id="partnerSharePercent"
                        type="number"
                        min="0"
                        max="100"
                        {...register("partnerSharePercent", {
                          valueAsNumber: true,
                          onChange: (e) => {
                            const val = Number(e.target.value) || 0;
                            setValue("userSharePercent", Math.max(0, 100 - val));
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

                {/* Live Split Preview */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-violet-500/20 text-xs">
                  <div className="p-2 rounded-lg bg-card border border-border/80">
                    <span className="text-muted-foreground block text-[11px]">
                      ส่วนของฉัน ({userSharePercent}%):
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(myMonthlyShare)}/งวด
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border/80">
                    <span className="text-muted-foreground block text-[11px]">
                      ส่วนคู่แชร์ ({partnerSharePercent}%):
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(partnerMonthlyShare)}/งวด
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Note */}
          <div className="space-y-1">
            <Label htmlFor="note">หมายเหตุเพิ่มเติม</Label>
            <Textarea
              id="note"
              rows={2}
              placeholder="เช่น ผ่อนผ่านบัตร KBank 0% 10 เดือน, ซื้อตอนโปรลดราคา 11.11"
              {...register("note")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังสร้างรายการและตารางงวด...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>สร้างรายการผ่อน</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
