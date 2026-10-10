"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  Sparkles,
  Plus,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  Info,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderIcon } from "@/components/ui/provider-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getSharedPageDataAction,
  recordSettlementAction,
  type SharedPageData,
} from "@/actions/settlement.actions";
import type { InstallmentWithDetails } from "@/types/installment";

export default function SharedPage() {
  const [data, setData] = React.useState<SharedPageData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Settlement Confirmation Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [settlementNote, setSettlementNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Load authoritative shared page data
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getSharedPageDataAction();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || "ไม่สามารถโหลดข้อมูลรายการผ่อนร่วมได้");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const res = await getSharedPageDataAction();
        if (ignore) return;
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error || "ไม่สามารถโหลดข้อมูลรายการผ่อนร่วมได้");
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  // Handle Settlement Submission
  const handleConfirmSettlement = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await recordSettlementAction({
        note: settlementNote.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || "บันทึกการเคลียร์ยอดเรียบร้อยแล้ว");
        setIsDialogOpen(false);
        setSettlementNote("");
        // Reload fresh authoritative state from database
        await loadData();
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึกเคลียร์ยอด");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Get user's avatar initials
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">ไม่สามารถโหลดข้อมูลได้</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
        <Button onClick={loadData} variant="outline" className="cursor-pointer">
          ลองใหม่อีกครั้ง
        </Button>
      </Card>
    );
  }

  const { netSettlement, sharedInstallments, settlementHistory, currentUserId, currentUserName } = data;

  const canSettle =
    netSettlement.hasSharedData &&
    netSettlement.netAmount > 0 &&
    (netSettlement.direction === "you_owe" || netSettlement.direction === "partner_owes");

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            <span>รายการผ่อนร่วม & ยอดเคลียร์</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            ระบบคำนวณส่วนแบ่งอัตโนมัติ 50/50 หรือตามเปอร์เซ็นต์ พร้อมยอดเคลียร์สุทธิตามฐานข้อมูลจริง
          </p>
        </div>
        <Link href="/installments?new=true">
          <Button className="gap-2 shadow-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>สร้างรายการผ่อนร่วม</span>
          </Button>
        </Link>
      </div>

      {/* Net Settlement Master Card */}
      <Card className="border-violet-500/40 bg-gradient-to-br from-violet-500/10 via-background to-primary/5 p-6 shadow-sm rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/10 text-violet-600 dark:text-violet-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>การคำนวณยอดเคลียร์สุทธิ (Net Settlement)</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-xs">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {getInitials(currentUserName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm font-semibold text-foreground">
                  {currentUserName}
                  <span className="block text-xs font-normal text-muted-foreground">คุณ</span>
                </div>
              </div>

              <div className="flex items-center justify-center p-2 rounded-full bg-muted/60 text-muted-foreground">
                <ArrowLeftRight className="h-5 w-5 text-violet-500" />
              </div>

              <div className="flex items-center gap-2">
                <Avatar className="h-12 w-12 border-2 border-violet-500/30 shadow-xs">
                  <AvatarFallback className="bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                    {getInitials(netSettlement.partnerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm font-semibold text-foreground">
                  {netSettlement.partnerName}
                  <span className="block text-xs font-normal text-muted-foreground">คู่แชร์</span>
                </div>
              </div>

              <div className="w-full sm:w-auto sm:ml-4 pt-2 sm:pt-0">
                <div className="text-xs font-medium text-muted-foreground">
                  ผลสรุปยอดคงค้างสุทธิ
                </div>
                <div className="text-2xl font-extrabold tracking-tight text-foreground">
                  {netSettlement.direction === "settled" ? (
                    <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5 inline" />
                      เคลียร์ยอดเรียบร้อยแล้ว (฿0)
                    </span>
                  ) : netSettlement.direction === "partner_owes" ? (
                    <>
                      {netSettlement.partnerName} ต้องโอนคืนคุณ{" "}
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(netSettlement.netAmount)}
                      </span>
                    </>
                  ) : netSettlement.direction === "you_owe" ? (
                    <>
                      คุณต้องโอนคืน {netSettlement.partnerName}{" "}
                      <span className="text-violet-600 dark:text-violet-400">
                        {formatCurrency(netSettlement.netAmount)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">ไม่มีรายการค้างเคลียร์ (฿0)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-lg text-xs">
              <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{netSettlement.partnerName} ค้างคุณ (คุณจ่ายแทน):</span>
                </div>
                <span className="font-bold text-foreground text-sm">
                  {formatCurrency(netSettlement.amountOthersOweMe)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-violet-500" />
                  <span>คุณค้าง {netSettlement.partnerName} ({netSettlement.partnerName} จ่ายแทน):</span>
                </div>
                <span className="font-bold text-foreground text-sm">
                  {formatCurrency(netSettlement.amountIOweOthers)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 shrink-0 sm:min-w-[200px]">
            <Button
              disabled={!canSettle}
              onClick={() => setIsDialogOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-2 cursor-pointer disabled:cursor-not-allowed shadow-xs h-11"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {netSettlement.direction === "settled"
                  ? "เคลียร์ยอดครบถ้วนแล้ว"
                  : canSettle
                  ? "บันทึกว่าเคลียร์ยอดแล้ว"
                  : "ไม่มียอดที่ต้องเคลียร์"}
              </span>
            </Button>

            {/* Slip / Notification Button: Handled honestly per Scope Section 6 Option B */}
            <div className="space-y-1">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-full text-xs cursor-not-allowed text-muted-foreground"
                title="ระบบส่งสลิปและแจ้งเตือนคู่แชร์จะเปิดให้ใช้งานในเฟสถัดไป"
              >
                <Receipt className="h-3.5 w-3.5 mr-1.5" />
                <span>ส่งสลิป / แจ้งเตือนคู่แชร์</span>
                <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1 font-normal">
                  เร็วๆ นี้
                </Badge>
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                ระบบส่งสลิปและแจ้งเตือนจะเปิดใช้งานในเฟสถัดไป
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Shared Installments List with Real Split Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>รายการผ่อนร่วมในปัจจุบัน</span>
            <Badge variant="secondary" className="font-semibold text-xs">
              {sharedInstallments.length} รายการ
            </Badge>
          </h3>
        </div>

        {sharedInstallments.length === 0 ? (
          <Card className="p-10 text-center border-dashed space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="font-semibold text-base text-foreground">ยังไม่มีรายการผ่อนร่วม</h4>
              <p className="text-xs text-muted-foreground">
                คุณยังไม่มีรายการที่ผ่อนร่วมกับคู่แชร์ สามารถกดปุ่มด้านล่างเพื่อสร้างรายการใหม่
                และระบบจะแบ่งยอดงวดให้อัตโนมัติ
              </p>
            </div>
            <Link href="/installments?new=true">
              <Button className="gap-2 cursor-pointer mt-2">
                <Plus className="h-4 w-4" />
                <span>สร้างรายการผ่อนร่วมรายการแรก</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {sharedInstallments.map((item: InstallmentWithDetails) => {
              const isOwner = item.ownerId === currentUserId;
              const myPercent = Number(isOwner ? item.userSharePercent : item.partnerSharePercent);
              const partnerPercent = Number(isOwner ? item.partnerSharePercent : item.userSharePercent);
              const partnerUser = isOwner ? item.partner : item.owner;
              const partnerName = partnerUser?.name || "คู่แชร์";

              const totalAmountNum = Number(item.totalAmount);
              const installmentAmountNum = Number(item.installmentAmount);
              const myShareAmount = (installmentAmountNum * myPercent) / 100;
              const partnerShareAmount = (installmentAmountNum * partnerPercent) / 100;

              // Find paid count & nearest unpaid payment
              const paidPayments = item.payments.filter(
                (p) => p.status === "PAID" || p.paidAt !== null
              );
              const paidCount = paidPayments.length;
              const nextUnpaid = item.payments.find(
                (p) => p.status !== "PAID" && p.paidAt === null
              );

              // Split ratio display
              let splitLabel = "50 / 50";
              if (item.splitType === "PERCENTAGE") {
                splitLabel = isOwner
                  ? `${myPercent} / ${partnerPercent}`
                  : `${partnerPercent} / ${myPercent}`;
              }

              // Nearest payment split status
              const mySplit = nextUnpaid?.splits.find((s) => s.userId === currentUserId);
              const partnerSplit = nextUnpaid?.splits.find((s) => s.userId !== currentUserId);

              const progressPct =
                item.totalInstallments > 0
                  ? Math.min(100, Math.round((paidCount / item.totalInstallments) * 100))
                  : 0;

              return (
                <Card
                  key={item.id}
                  className="p-5 hover:border-violet-500/40 transition-colors shadow-2xs rounded-2xl"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Item Information */}
                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: item.provider?.color
                              ? `${item.provider.color}15`
                              : "rgba(139, 92, 246, 0.1)",
                            borderColor: item.provider?.color
                              ? `${item.provider.color}40`
                              : "rgba(139, 92, 246, 0.2)",
                            color: item.provider?.color || "#8B5CF6",
                          }}
                        >
                          <ProviderIcon slug={item.provider?.slug} className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-base text-foreground">
                          {item.name}
                        </span>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {item.provider?.name}
                        </Badge>
                        <Badge variant="shared" className="text-xs font-semibold">
                          สัดส่วน {splitLabel}
                        </Badge>
                        <Badge
                          variant={item.status === "COMPLETED" ? "paid" : "outline"}
                          className="text-xs"
                        >
                          {item.status === "COMPLETED" ? "ผ่อนครบแล้ว" : "กำลังผ่อนชำระ"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          สัญญาเต็ม:{" "}
                          <strong className="text-foreground">
                            {formatCurrency(totalAmountNum)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          ค่างวด:{" "}
                          <strong className="text-foreground">
                            {formatCurrency(installmentAmountNum)}
                          </strong>
                          /เดือน
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 inline text-muted-foreground" />
                          งวดถัดไป:{" "}
                          <strong className="text-foreground">
                            {nextUnpaid ? formatDate(nextUnpaid.dueDate) : "ครบทุกงวดแล้ว"}
                          </strong>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-1 max-w-md">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>
                            ความคืบหน้า: งวดที่ {paidCount}/{item.totalInstallments}
                          </span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-600 transition-all rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Split Responsibilities (Authenticated User vs Partner) */}
                    <div className="flex items-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-border/60">
                      {/* Current User Share */}
                      <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-center min-w-[130px] flex-1 sm:flex-initial">
                        <div className="text-[11px] text-muted-foreground font-semibold">
                          คุณ ({myPercent}%)
                        </div>
                        <div className="text-sm font-extrabold text-foreground mt-0.5">
                          {formatCurrency(myShareAmount)}
                        </div>
                        <Badge
                          variant={mySplit?.status === "PAID" ? "paid" : "due"}
                          className="text-[10px] mt-1.5"
                        >
                          {mySplit?.status === "PAID" ? "จ่ายแล้ว" : "รอบิลถัดไป"}
                        </Badge>
                      </div>

                      {/* Partner Share */}
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-center min-w-[130px] flex-1 sm:flex-initial">
                        <div className="text-[11px] text-muted-foreground font-semibold truncate max-w-[120px] mx-auto">
                          {partnerName} ({partnerPercent}%)
                        </div>
                        <div className="text-sm font-extrabold text-foreground mt-0.5">
                          {formatCurrency(partnerShareAmount)}
                        </div>
                        <Badge
                          variant={partnerSplit?.status === "PAID" ? "paid" : "due"}
                          className="text-[10px] mt-1.5"
                        >
                          {partnerSplit?.status === "PAID" ? "จ่ายแล้ว" : "รอบิลถัดไป"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Settlement History Section */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <span>ประวัติการเคลียร์ยอดที่ผ่านมา (Settlement History)</span>
        </h3>

        {settlementHistory.length === 0 ? (
          <Card className="p-6 text-center text-xs text-muted-foreground">
            ยังไม่มีประวัติการบันทึกเคลียร์ยอดที่สำเร็จในระบบ
          </Card>
        ) : (
          <div className="space-y-2.5">
            {settlementHistory.map((history) => (
              <Card
                key={history.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="paid" className="text-[10px] font-semibold">
                      เคลียร์แล้ว
                    </Badge>
                    <span className="font-semibold text-foreground text-sm">
                      {formatCurrency(history.amount)}
                    </span>
                    <span className="text-muted-foreground">
                      ({history.fromUserName} โอนให้ {history.toUserName})
                    </span>
                  </div>
                  {history.note && (
                    <p className="text-muted-foreground italic">
                      หมายเหตุ: &ldquo;{history.note}&rdquo;
                    </p>
                  )}
                </div>
                <div className="text-muted-foreground text-[11px] shrink-0">
                  {formatDate(history.settledAt || history.createdAt)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Settlement Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <span>ยืนยันการบันทึกเคลียร์ยอด</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              ระบบจะบันทึกธุรกรรมการเคลียร์ยอดหนี้สุทธินี้ลงในระบบการเงินจริง
              และปรับยอดหนี้คงค้างสุทธิระหว่างกันเป็น ฿0
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Transaction Summary Card */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">ผู้โอน / ชำระ:</span>
                <span className="font-bold text-foreground">
                  {netSettlement.direction === "you_owe"
                    ? `${currentUserName} (คุณ)`
                    : netSettlement.partnerName}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">ผู้รับเงิน:</span>
                <span className="font-bold text-foreground">
                  {netSettlement.direction === "you_owe"
                    ? netSettlement.partnerName
                    : `${currentUserName} (คุณ)`}
                </span>
              </div>
              <div className="border-t border-border/80 pt-2 flex justify-between items-center">
                <span className="font-semibold text-foreground">ยอดเงินที่เคลียร์สุทธิ:</span>
                <span className="text-lg font-extrabold text-violet-600 dark:text-violet-400">
                  {formatCurrency(netSettlement.netAmount)}
                </span>
              </div>
            </div>

            {/* Note input */}
            <div className="space-y-1.5">
              <Label htmlFor="settlement-note" className="text-xs">
                บันทึกช่วยจำ (ไม่บังคับ)
              </Label>
              <Input
                id="settlement-note"
                placeholder="เช่น โอนผ่านพร้อมเพย์แล้ว, สแกน QR เรียบร้อย"
                value={settlementNote}
                onChange={(e) => setSettlementNote(e.target.value)}
                disabled={isSubmitting}
                className="text-xs"
              />
            </div>

            {/* Safety Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                เมื่อกดยืนยัน รายการเคลียร์ยอดจะถูกบันทึกลงในระบบอย่างถาวร
                และตารางงวดร่วมที่ได้รับการออกแทนจะถูกปรับสถานะเป็นจ่ายแล้ว
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSettlement}
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold cursor-pointer gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>ยืนยันเคลียร์ยอด</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
