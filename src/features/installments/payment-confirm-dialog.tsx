"use client";

import * as React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import { markPaymentAsPaidAction } from "@/actions/payment.actions";

export interface PaymentConfirmTarget {
  paymentId: string;
  installmentName: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  note?: string;
}

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PaymentConfirmTarget | null;
  onSuccess?: () => void | Promise<void>;
}

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  target,
  onSuccess,
}: PaymentConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!target) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await markPaymentAsPaidAction(target.paymentId);
      if (res.success) {
        toast.success(
          `บันทึกชำระงวดที่ #${target.installmentNumber} ของ "${target.installmentName}" เรียบร้อยแล้ว`
        );
        onOpenChange(false);
        if (onSuccess) {
          await onSuccess();
        }
      } else {
        toast.error(res.error || "ไม่สามารถบันทึกการชำระเงินได้");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && onOpenChange(isOpen)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                ยืนยันการชำระเงิน
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                คุณต้องการบันทึกว่าชำระเงินงวดนี้แล้วใช่หรือไม่?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Details Card */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground shrink-0">รายการ:</span>
            <span className="font-semibold text-foreground text-right truncate">
              {target.installmentName}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground shrink-0">งวดที่:</span>
            <span className="font-semibold text-foreground">
              {target.installmentNumber} จาก {target.totalInstallments}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
            <span className="text-muted-foreground shrink-0">จำนวนเงิน:</span>
            <span className="text-base font-bold text-primary">
              {formatCurrency(target.amount)}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            ยกเลิก
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="text-xs gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <span>ยืนยันว่าจ่ายแล้ว</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
