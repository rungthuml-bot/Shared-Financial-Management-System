"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
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
import { formatCurrency } from "@/lib/utils";
import { ProviderIcon } from "@/components/ui/provider-icon";
import { revertPaymentPaidAction } from "@/actions/payment.actions";
import { PaymentConfirmDialog } from "@/features/installments/payment-confirm-dialog";
import { getPaymentStatusLabel, formatSplitDisplayThai } from "@/lib/status-utils";
import type { CalendarEventItem } from "@/services/calendar.service";

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEventItem | null;
  onUpdated?: () => void;
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  event,
  onUpdated,
}: CalendarEventDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (!event) return null;

  const isPaid = event.status === "PAID" || event.paidAt !== null;


  const handleRevertPaid = async () => {
    setLoading(true);
    try {
      const res = await revertPaymentPaidAction(event.id);
      if (res.success) {
        toast.success(`ยกเลิกสถานะชำระงวดที่ #${event.installmentNumber} เรียบร้อยแล้ว`);
        onOpenChange(false);
        onUpdated?.();
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาดในการยกเลิกสถานะ");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground">
              <ProviderIcon slug={event.provider.slug} className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">{event.title}</DialogTitle>
              <DialogDescription className="text-xs">
                งวดที่ {event.installmentNumber} จากทั้งหมด {event.totalInstallments} งวด
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status & Ownership Badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Badge
                variant={
                  isPaid
                    ? "paid"
                    : event.status === "OVERDUE"
                    ? "overdue"
                    : event.status === "DUE"
                    ? "due"
                    : "upcoming"
                }
                className="text-xs"
              >
                {getPaymentStatusLabel(event.status)}
              </Badge>
              <Badge
                variant={event.ownershipType === "SHARED" ? "shared" : "personal"}
                className="text-xs"
              >
                {formatSplitDisplayThai(event.splitDisplay, event.ownershipType)}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>ครบกำหนด: {event.dueDateFormatted}</span>
            </div>
          </div>

          {/* Amount Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <span className="text-[11px] text-muted-foreground block">ส่วนของคุณ</span>
              <span className="text-lg font-bold text-foreground block mt-0.5">
                {formatCurrency(event.myShare)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <span className="text-[11px] text-muted-foreground block">ยอดเต็มงวดนี้</span>
              <span className="text-lg font-bold text-muted-foreground block mt-0.5">
                {formatCurrency(event.amount)}
              </span>
            </div>
          </div>

          {/* Shared Splits Details */}
          {event.ownershipType === "SHARED" && event.splits.length > 0 && (
            <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
                <Users2 className="h-3.5 w-3.5" />
                <span>สัดส่วนการแบ่งจ่าย</span>
              </div>
              <div className="space-y-1 text-xs">
                {event.splits.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {s.userName} ({s.percentage}%):
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(s.amount)}
                      {s.status === "PAID" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 inline ml-1" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provider & Category Info */}
          <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span>ผู้ให้บริการ:</span>
              <span className="font-medium text-foreground">{event.provider.name}</span>
            </div>
            {event.category && (
              <div className="flex items-center justify-between">
                <span>หมวดหมู่:</span>
                <span className="font-medium text-foreground">{event.category.name}</span>
              </div>
            )}
            {event.paidAt && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>ชำระเมื่อ:</span>
                <span className="font-medium">{event.paidAt.split("T")[0]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>

          {isPaid ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevertPaid}
              disabled={loading}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              <span>ยกเลิกชำระ</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
              className="gap-1.5 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>บันทึกว่าจ่ายแล้ว</span>
            </Button>
          )}
        </div>
      </DialogContent>

      <PaymentConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        target={{
          paymentId: event.id,
          installmentName: event.title,
          installmentNumber: event.installmentNumber,
          totalInstallments: event.totalInstallments,
          amount: event.myShare,
        }}
        onSuccess={() => {
          onOpenChange(false);
          onUpdated?.();
        }}
      />
    </Dialog>
  );
}
