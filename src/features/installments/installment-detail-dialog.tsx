"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle2,
  RotateCcw,
  Users2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  markPaymentAsPaidAction,
  revertPaymentPaidAction,
} from "@/actions/payment.actions";
import type { InstallmentWithDetails } from "@/types/installment";

interface InstallmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: InstallmentWithDetails | null;
  currentUserId?: string;
  onPaymentUpdated?: () => void;
}

export function InstallmentDetailDialog({
  open,
  onOpenChange,
  installment,
  currentUserId,
  onPaymentUpdated,
}: InstallmentDetailDialogProps) {
  const [loadingPaymentId, setLoadingPaymentId] = React.useState<string | null>(null);

  if (!installment) return null;

  const totalAmountNum = Number(installment.totalAmount);
  const downPaymentNum = Number(installment.downPayment);
  const monthlyAmountNum = Number(installment.installmentAmount);

  const payments = installment.payments || [];
  const paidPayments = payments.filter((p) => p.status === "PAID");
  const paidCount = paidPayments.length;
  const totalPaidAmount = paidPayments.reduce((acc, p) => acc + Number(p.amount), 0);
  const progressPercent = Math.round((paidCount / installment.totalInstallments) * 100);

  const handleMarkPaid = async (paymentId: string) => {
    setLoadingPaymentId(paymentId);
    try {
      const res = await markPaymentAsPaidAction(paymentId);
      if (res.success) {
        toast.success("บันทึกการชำระเงินงวดนี้เรียบร้อยแล้ว");
        onPaymentUpdated?.();
      } else {
        toast.error(res.error || "ไม่สามารถบันทึกชำระเงินได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoadingPaymentId(null);
    }
  };

  const handleRevertPaid = async (paymentId: string) => {
    setLoadingPaymentId(paymentId);
    try {
      const res = await revertPaymentPaidAction(paymentId);
      if (res.success) {
        toast.success("ยกเลิกสถานะชำระเงินแล้ว");
        onPaymentUpdated?.();
      } else {
        toast.error(res.error || "ไม่สามารถยกเลิกได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoadingPaymentId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span>{installment.name}</span>
              <Badge
                variant={installment.ownershipType === "SHARED" ? "shared" : "personal"}
                className="text-xs"
              >
                {installment.ownershipType}
              </Badge>
            </DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2 flex-wrap text-xs">
            <span>ผู้ให้บริการ: <strong>{installment.provider.name}</strong></span>
            {installment.category && (
              <>
                <span>•</span>
                <span>หมวดหมู่: <strong>{installment.category.name}</strong></span>
              </>
            )}
            <span>•</span>
            <span>กำหนดชำระทุกวันที่ <strong>{installment.dueDay}</strong></span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Progress & Overview Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">ความคืบหน้าการผ่อน</span>
              <span className="font-bold text-foreground">
                ชำระแล้ว {paidCount} จาก {installment.totalInstallments} งวด ({progressPercent}%)
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block text-[11px]">ราคาเต็มสัญญา</span>
                <span className="font-bold text-foreground text-sm">
                  {formatCurrency(totalAmountNum)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block text-[11px]">เงินดาวน์</span>
                <span className="font-bold text-foreground text-sm">
                  {formatCurrency(downPaymentNum)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block text-[11px]">ค่างวดต่อเดือน</span>
                <span className="font-bold text-primary text-sm">
                  {formatCurrency(monthlyAmountNum)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-muted-foreground block text-[11px]">ชำระแล้วสะสม</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(totalPaidAmount)}
                </span>
              </div>
            </div>

            {/* Shared Partner Details */}
            {installment.ownershipType === "SHARED" && (
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="font-semibold text-foreground">
                    รายการผ่อนร่วม (Split: {installment.splitType}):
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    เจ้าของ ({installment.owner.name}):{" "}
                    <strong className="text-foreground">
                      {Number(installment.userSharePercent)}%
                    </strong>
                  </span>
                  {installment.partner && (
                    <span>
                      คู่แชร์ ({installment.partner.name}):{" "}
                      <strong className="text-foreground">
                        {Number(installment.partnerSharePercent)}%
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Schedule Table */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <span>ตารางงวดการผ่อนชำระ (Payment Schedule)</span>
            </h4>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground border-b border-border font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">งวดที่</th>
                      <th className="py-2.5 px-3">กำหนดชำระ</th>
                      <th className="py-2.5 px-3">ยอดชำระ</th>
                      {installment.ownershipType === "SHARED" && (
                        <th className="py-2.5 px-3">สัดส่วนแชร์</th>
                      )}
                      <th className="py-2.5 px-3">สถานะ</th>
                      <th className="py-2.5 px-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {payments.map((p) => {
                      const amountNum = Number(p.amount);
                      const isPaid = p.status === "PAID";
                      const isOverdue = p.status === "OVERDUE";
                      const isDue = p.status === "DUE";
                      const isLoading = loadingPaymentId === p.id;

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-accent/40 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-foreground">
                            #{p.installmentNumber}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {formatDate(p.dueDate)}
                            {p.paidAt && (
                              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                                จ่ายเมื่อ {formatDate(p.paidAt)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground">
                            {formatCurrency(amountNum)}
                          </td>

                          {/* Splits Column if shared */}
                          {installment.ownershipType === "SHARED" && (
                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                {p.splits.map((sp) => (
                                  <div
                                    key={sp.id}
                                    className="text-[11px] text-muted-foreground flex items-center gap-1"
                                  >
                                    <span className="font-medium text-foreground">
                                      {sp.user.name}
                                      {currentUserId && sp.userId === currentUserId && " (คุณ)"}:
                                    </span>
                                    <span>{formatCurrency(Number(sp.amount))}</span>
                                    {sp.status === "PAID" && (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          )}

                          <td className="py-3 px-3">
                            <Badge
                              variant={
                                isPaid
                                  ? "paid"
                                  : isOverdue
                                  ? "overdue"
                                  : isDue
                                  ? "due"
                                  : "upcoming"
                              }
                              className="text-[10px] font-semibold"
                            >
                              {p.status}
                            </Badge>
                          </td>

                          <td className="py-3 px-3 text-right">
                            {isPaid ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRevertPaid(p.id)}
                                disabled={isLoading}
                                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                                title="ยกเลิกสถานะชำระเงิน"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                <span>ยกเลิก</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleMarkPaid(p.id)}
                                disabled={isLoading}
                                className="h-7 px-3 text-xs gap-1 shadow-2xs"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                <span>จ่ายแล้ว</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
