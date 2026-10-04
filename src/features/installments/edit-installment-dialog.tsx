"use client";

import * as React from "react";
import { Edit2, Loader2, AlertCircle } from "lucide-react";
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
import { updateInstallmentAction } from "@/actions/installment.actions";
import type { InstallmentWithDetails } from "@/types/installment";

interface EditInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: InstallmentWithDetails | null;
  providers: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

function EditInstallmentForm({
  installment,
  providers,
  categories,
  onClose,
  onSuccess,
}: {
  installment: InstallmentWithDetails;
  providers: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [name, setName] = React.useState(installment.name);
  const [description, setDescription] = React.useState(installment.description || "");
  const [providerId, setProviderId] = React.useState(installment.providerId);
  const [categoryId, setCategoryId] = React.useState(installment.categoryId || "");
  const [dueDay, setDueDay] = React.useState(installment.dueDay);
  const [note, setNote] = React.useState(installment.note || "");

  const paidCount = installment.payments.filter(
    (p) => p.status === "PAID" || p.paidAt !== null
  ).length;
  const hasPaidHistory = paidCount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("กรุณาระบุชื่อรายการผ่อน");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateInstallmentAction(installment.id, {
        id: installment.id,
        name: name.trim(),
        description: description.trim() || undefined,
        providerId,
        categoryId: categoryId || undefined,
        dueDay: Number(dueDay),
        note: note.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || "แก้ไขรายการผ่อนสำเร็จ");
        onClose();
        onSuccess?.();
      } else {
        toast.error(res.error || "ไม่สามารถแก้ไขรายการผ่อนได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {hasPaidHistory && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>รายการนี้มีประวัติชำระแล้ว {paidCount} งวด:</strong>
            <p className="mt-0.5 text-muted-foreground">
              เพื่อความถูกต้องของประวัติบัญชี ระบบจะล็อคราคาเต็มและจำนวนงวด
              แต่คุณยังสามารถแก้ไขชื่อ ผู้ให้บริการ หมวดหมู่ วันครบกำหนด
              และหมายเหตุได้
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        <div className="space-y-1">
          <Label htmlFor="edit-name">ชื่อรายการผ่อน *</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="edit-provider">ผู้ให้บริการ *</Label>
            <select
              id="edit-provider"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-category">หมวดหมู่</Label>
            <select
              id="edit-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="">ไม่ระบุหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-dueDay">วันครบกำหนดของแต่ละเดือน (1-31)</Label>
          <Input
            id="edit-dueDay"
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-desc">รายละเอียดเพิ่มเติม</Label>
          <Input
            id="edit-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="รายละเอียดสั้นๆ"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-note">หมายเหตุ</Label>
          <Textarea
            id="edit-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <span>บันทึกการแก้ไข</span>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function EditInstallmentDialog({
  open,
  onOpenChange,
  installment,
  providers,
  categories,
  onSuccess,
}: EditInstallmentDialogProps) {
  if (!installment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            <span>แก้ไขข้อมูลรายการผ่อน</span>
          </DialogTitle>
          <DialogDescription>
            ปรับปรุงรายละเอียดรายการผ่อนชำระ
          </DialogDescription>
        </DialogHeader>

        <EditInstallmentForm
          key={installment.id}
          installment={installment}
          providers={providers}
          categories={categories}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
