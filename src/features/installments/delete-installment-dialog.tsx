"use client";

import * as React from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
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
import { deleteInstallmentAction } from "@/actions/installment.actions";
import type { InstallmentWithDetails } from "@/types/installment";

interface DeleteInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: InstallmentWithDetails | null;
  onSuccess?: () => void;
}

export function DeleteInstallmentDialog({
  open,
  onOpenChange,
  installment,
  onSuccess,
}: DeleteInstallmentDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!installment) return null;

  const paidCount = installment.payments.filter(
    (p) => p.status === "PAID" || p.paidAt !== null
  ).length;
  const isBlocked = paidCount > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteInstallmentAction(installment.id);
      if (res.success) {
        toast.success(res.message || "ลบรายการเรียบร้อยแล้ว");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "ไม่สามารถลบรายการผ่อนได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>ยืนยันการลบรายการผ่อนชำระ</span>
          </DialogTitle>
          <DialogDescription>
            คุณแน่ใจหรือไม่ว่าต้องการลบรายการ &ldquo;{installment.name}&rdquo;?
          </DialogDescription>
        </DialogHeader>

        {isBlocked ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
            <strong>ไม่สามารถลบรายการนี้ได้:</strong>
            <p>
              รายการนี้มีประวัติการชำระเงินแล้ว <strong>{paidCount} งวด</strong>{" "}
              ตามมาตรฐานความปลอดภัยทางบัญชี
              ระบบจะไม่อนุญาตให้ลบข้อมูลที่มีประวัติการเงินจริง
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-muted/60 text-xs text-muted-foreground space-y-1">
            <p>การลบรายการนี้จะลบตารางงวดทั้งหมดที่ยังไม่ได้ชำระออกอย่างถาวร</p>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isBlocked || isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังลบ...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>ยืนยันลบรายการ</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
