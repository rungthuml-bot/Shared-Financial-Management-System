"use client";

import * as React from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getInstallmentsAction,
  getFormDependenciesAction,
} from "@/actions/installment.actions";
import { CreateInstallmentDialog } from "@/features/installments/create-installment-dialog";
import { EditInstallmentDialog } from "@/features/installments/edit-installment-dialog";
import { DeleteInstallmentDialog } from "@/features/installments/delete-installment-dialog";
import { InstallmentDetailDialog } from "@/features/installments/installment-detail-dialog";
import {
  PaymentConfirmDialog,
  type PaymentConfirmTarget,
} from "@/features/installments/payment-confirm-dialog";
import type { InstallmentWithDetails } from "@/types/installment";

export default function InstallmentsPage() {
  const [installments, setInstallments] = React.useState<InstallmentWithDetails[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Filter & Search
  const [filterTab, setFilterTab] = React.useState<"all" | "personal" | "shared">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Dialog states
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<InstallmentWithDetails | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<InstallmentWithDetails | null>(null);
  const [detailItem, setDetailItem] = React.useState<InstallmentWithDetails | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<PaymentConfirmTarget | null>(null);

  // Check if opened via URL query parameter (e.g. /installments?new=true from Header)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("new") === "true") {
          setCreateOpen(true);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Form dependencies (providers, categories, partners)
  const [formData, setFormData] = React.useState<{
    providers: Array<{ id: string; name: string; slug: string }>;
    categories: Array<{ id: string; name: string; slug: string }>;
    partners: Array<{ id: string; name: string; email: string }>;
    currentUser?: { id: string; name: string; email: string };
  }>({
    providers: [
      { id: "prov_shopee", name: "Shopee", slug: "shopee" },
      { id: "prov_tiktok", name: "TikTok Shop", slug: "tiktok-shop" },
      { id: "prov_lazada", name: "Lazada", slug: "lazada" },
      { id: "prov_credit_card", name: "Credit Card", slug: "credit-card" },
      { id: "prov_truemoney", name: "TrueMoney", slug: "truemoney" },
      { id: "prov_mobile", name: "Mobile", slug: "mobile" },
      { id: "prov_other", name: "Other", slug: "other" },
    ],
    categories: [
      { id: "cat_shopping", name: "Shopping", slug: "shopping" },
      { id: "cat_electronics", name: "Electronics", slug: "electronics" },
      { id: "cat_mobile", name: "Mobile", slug: "mobile" },
      { id: "cat_home", name: "Home", slug: "home" },
      { id: "cat_other", name: "Other", slug: "other" },
    ],
    partners: [
      { id: "usr_user_b_default", name: "User B", email: "userb@example.com" },
    ],
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [instRes, depRes] = await Promise.all([
        getInstallmentsAction(),
        getFormDependenciesAction(),
      ]);

      if (instRes.success && Array.isArray(instRes.data)) {
        setInstallments(instRes.data as InstallmentWithDetails[]);
      } else if (!instRes.success) {
        setErrorMsg(instRes.error);
      }

      if (depRes.success && depRes.data) {
        const d = depRes.data as {
          providers: Array<{ id: string; name: string; slug: string }>;
          categories: Array<{ id: string; name: string; slug: string }>;
          partners: Array<{ id: string; name: string; email: string }>;
          currentUser?: { id: string; name: string; email: string };
        };
        setFormData((prev) => ({
          ...prev,
          ...(d.providers?.length ? { providers: d.providers } : {}),
          ...(d.categories?.length ? { categories: d.categories } : {}),
          ...(d.partners?.length ? { partners: d.partners } : {}),
          currentUser: d.currentUser,
        }));
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการโหลดข้อมูล (ฐานข้อมูลอาจยังไม่ได้เปิดบริการ)"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function initFetch() {
      try {
        const [instRes, depRes] = await Promise.all([
          getInstallmentsAction(),
          getFormDependenciesAction(),
        ]);

        if (ignore) return;

        if (instRes.success && Array.isArray(instRes.data)) {
          setInstallments(instRes.data as InstallmentWithDetails[]);
        } else if (!instRes.success) {
          setErrorMsg(instRes.error);
        }

        if (depRes.success && depRes.data) {
          const d = depRes.data as {
            providers: Array<{ id: string; name: string; slug: string }>;
            categories: Array<{ id: string; name: string; slug: string }>;
            partners: Array<{ id: string; name: string; email: string }>;
            currentUser?: { id: string; name: string; email: string };
          };
          setFormData((prev) => ({
            ...prev,
            ...(d.providers?.length ? { providers: d.providers } : {}),
            ...(d.categories?.length ? { categories: d.categories } : {}),
            ...(d.partners?.length ? { partners: d.partners } : {}),
            currentUser: d.currentUser,
          }));
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "เกิดข้อผิดพลาดในการโหลดข้อมูล (ฐานข้อมูลอาจยังไม่ได้เปิดบริการ)"
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void initFetch();

    return () => {
      ignore = true;
    };
  }, []);

  // Filter items
  const filteredItems = installments.filter((item) => {
    if (filterTab === "personal" && item.ownershipType !== "PERSONAL") return false;
    if (filterTab === "shared" && item.ownershipType !== "SHARED") return false;
    if (
      searchQuery &&
      !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.provider.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleQuickPayNext = (item: InstallmentWithDetails) => {
    // Find next unpaid payment
    const nextUnpaid = item.payments.find((p) => p.status !== "PAID");
    if (!nextUnpaid) {
      toast.info("รายการนี้ชำระเงินครบทุกงวดแล้ว");
      return;
    }

    const monthlyAmountNum = Number(item.installmentAmount);
    const myShareMonthly =
      item.ownershipType === "PERSONAL"
        ? monthlyAmountNum
        : Math.round(
            monthlyAmountNum * (Number(item.userSharePercent) / 100) * 100
          ) / 100;

    setConfirmTarget({
      paymentId: nextUnpaid.id,
      installmentName: item.name,
      installmentNumber: nextUnpaid.installmentNumber,
      totalInstallments: item.totalInstallments,
      amount: myShareMonthly,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            จัดการรายการผ่อนชำระ
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            จัดการสัญญาผ่อนชำระ ตรวจสอบตารางงวด และบันทึกการชำระเงิน
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>เพิ่มรายการผ่อนใหม่</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/70 border border-border/60">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterTab === "all"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ทั้งหมด ({installments.length})
          </button>
          <button
            onClick={() => setFilterTab("personal")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterTab === "personal"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ส่วนตัว
          </button>
          <button
            onClick={() => setFilterTab("shared")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterTab === "shared"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ผ่อนร่วม
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหารายการ, ผู้ให้บริการ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Database Offline Notice Banner (if local postgres isn't running) */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-1">
            <strong className="text-sm font-bold block">
              สถานะการเชื่อมต่อฐานข้อมูล PostgreSQL
            </strong>
            <p>
              {errorMsg} —
              ระบบ Server Actions, Zod Validators, Service Layer และ
              Schedule Generation พร้อมสมบูรณ์แล้ว หากเริ่มใช้งานจริง
              โปรดเปิด PostgreSQL ผ่าน Docker หรือระบุ DATABASE_URL ในไฟล์ .env
            </p>
          </div>
        </div>
      )}

      {/* Content Area: Loading / Empty / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-2xl border border-dashed border-border p-8 bg-card/40">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">
              {searchQuery
                ? "ไม่พบรายการที่ค้นหา"
                : filterTab === "shared"
                ? "ยังไม่มีรายการผ่อนร่วม"
                : "ยังไม่มีรายการผ่อนชำระ"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? "ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง"
                : "เริ่มต้นสร้างรายการผ่อนรายการแรก เพื่อติดตามงวดและแบ่งจ่ายอย่างเป็นระบบ"}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span>สร้างรายการผ่อนใหม่</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const totalAmountNum = Number(item.totalAmount);
            const monthlyAmountNum = Number(item.installmentAmount);
            const paidCount = item.payments.filter((p) => p.status === "PAID").length;
            const progressPercent = Math.round(
              (paidCount / item.totalInstallments) * 100
            );
            const remainingAmount = Math.max(
              0,
              totalAmountNum - paidCount * monthlyAmountNum
            );

            // Compute user share
            const myShareMonthly =
              item.ownershipType === "PERSONAL"
                ? monthlyAmountNum
                : Math.round(
                    monthlyAmountNum * (Number(item.userSharePercent) / 100) * 100
                  ) / 100;

            const nextDuePayment = item.payments.find((p) => p.status !== "PAID");

            return (
              <Card
                key={item.id}
                className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground leading-tight">
                          {item.name}
                        </span>
                        <Badge
                          variant={item.ownershipType === "SHARED" ? "shared" : "personal"}
                          className="text-[11px]"
                        >
                          {item.ownershipType === "SHARED"
                            ? `ผ่อนร่วม (${item.splitType === "EQUAL" ? "50/50" : `${Number(item.userSharePercent)}/${Number(item.partnerSharePercent)}`})`
                            : "ส่วนตัว"}
                        </Badge>
                        {item.status === "COMPLETED" && (
                          <Badge variant="paid" className="text-[10px]">
                            ผ่อนครบแล้ว
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{item.provider.name}</span>
                        <span>•</span>
                        <span>ครบกำหนดวันที่ {item.dueDay} ของทุกเดือน</span>
                      </p>
                    </div>

                    <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-muted text-foreground shrink-0">
                      งวด {paidCount}/{item.totalInstallments}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>ความคืบหน้า</span>
                      <span className="font-medium text-foreground">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-muted/40">
                      <span className="text-muted-foreground block text-[11px]">
                        ยอดชำระต่องวด
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(monthlyAmountNum)}
                      </span>
                      {item.ownershipType === "SHARED" && (
                        <span className="text-[11px] text-violet-600 dark:text-violet-400 block font-medium">
                          ส่วนของฉัน: {formatCurrency(myShareMonthly)}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40">
                      <span className="text-muted-foreground block text-[11px]">
                        ยอดคงเหลือทั้งหมด
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(remainingAmount)}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        ราคาเต็ม {formatCurrency(totalAmountNum)}
                      </span>
                    </div>
                  </div>

                  {nextDuePayment && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>
                        งวดถัดไป #{nextDuePayment.installmentNumber}: ครบกำหนด{" "}
                        {formatDate(nextDuePayment.dueDate)}
                      </span>
                    </div>
                  )}

                  {item.note && (
                    <p className="text-xs text-muted-foreground/80 italic">
                      &ldquo;{item.note}&rdquo;
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailItem(item)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ดูตาราง {item.totalInstallments} งวด
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditItem(item)}
                      className="h-8 px-2.5 text-xs"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteItem(item)}
                      className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                      title="ลบรายการ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleQuickPayNext(item)}
                      disabled={!nextDuePayment}
                      className="h-8 px-3 text-xs"
                    >
                      จ่ายงวดนี้
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals & Dialogs */}
      <CreateInstallmentDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && typeof window !== "undefined" && window.location.search.includes("new=true")) {
            window.history.replaceState({}, "", "/installments");
          }
        }}
        dependencies={formData}
        onSuccess={loadData}
      />

      <EditInstallmentDialog
        open={Boolean(editItem)}
        onOpenChange={(op) => !op && setEditItem(null)}
        installment={editItem}
        providers={formData.providers}
        categories={formData.categories}
        onSuccess={loadData}
      />

      <DeleteInstallmentDialog
        open={Boolean(deleteItem)}
        onOpenChange={(op) => !op && setDeleteItem(null)}
        installment={deleteItem}
        onSuccess={loadData}
      />

      <InstallmentDetailDialog
        open={Boolean(detailItem)}
        onOpenChange={(op) => !op && setDetailItem(null)}
        installment={detailItem}
        currentUserId={formData.currentUser?.id}
        onPaymentUpdated={() => {
          loadData();
          // Reload currently open item
          if (detailItem) {
            getInstallmentsAction().then((res) => {
              if (res.success && Array.isArray(res.data)) {
                const refreshed = (res.data as InstallmentWithDetails[]).find(
                  (i) => i.id === detailItem.id
                );
                if (refreshed) setDetailItem(refreshed);
              }
            });
          }
        }}
      />

      <PaymentConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(op) => !op && setConfirmTarget(null)}
        target={confirmTarget}
        onSuccess={loadData}
      />
    </div>
  );
}
