"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  ArrowLeftRight,
  Inbox,
  CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import { ProviderIcon } from "@/components/ui/provider-icon";
import { getDashboardDataAction } from "@/actions/dashboard.actions";
import { DashboardCharts } from "@/features/dashboard/dashboard-charts";
import {
  PaymentConfirmDialog,
  type PaymentConfirmTarget,
} from "@/features/installments/payment-confirm-dialog";
import { formatSplitDisplayThai } from "@/lib/status-utils";
import type { DashboardData, TimeframeFilter } from "@/services/dashboard.service";

export default function DashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [timeframe, setTimeframe] = React.useState<TimeframeFilter>("this_month");
  const [confirmTarget, setConfirmTarget] = React.useState<PaymentConfirmTarget | null>(null);

  const fetchDashboardData = React.useCallback(async (tf: TimeframeFilter) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getDashboardDataAction(tf);
      if (res.success) {
        setData(res.data);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลภาพรวม"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const res = await getDashboardDataAction(timeframe);
        if (ignore) return;
        if (res.success) {
          setData(res.data);
        } else {
          setErrorMsg(res.error);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลภาพรวม"
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      ignore = true;
    };
  }, [timeframe]);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-muted rounded-xl" />
          <div className="h-9 w-32 bg-muted rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="p-8 text-center space-y-4 rounded-2xl border border-destructive/20 bg-destructive/5 max-w-lg mx-auto my-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">ไม่สามารถโหลดข้อมูลภาพรวมได้</h3>
        <p className="text-xs text-muted-foreground">{errorMsg}</p>
        <Button onClick={() => fetchDashboardData(timeframe)} variant="outline" size="sm">
          ลองใหม่อีกครั้ง
        </Button>
      </div>
    );
  }

  const d = data!;

  const timeframeLabels: Record<TimeframeFilter, string> = {
    this_month: "เดือนนี้",
    next_month: "เดือนหน้า",
    last_3_months: "3 เดือน",
    all_time: "ทั้งหมด",
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* ======================================================== */}
      {/* SECTION A — Page Header & Quick Action */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            ภาพรวม
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            สรุปสถานะการผ่อนของคุณ • รอบบิล{" "}
            <span className="font-semibold text-foreground">{d.period.label}</span>
          </p>
        </div>

        {/* Timeframe Filter Pills & Primary Action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Filter Segment */}
          <div className="flex rounded-xl bg-muted/80 p-1 text-xs border border-border/60">
            {(["this_month", "next_month", "last_3_months", "all_time"] as TimeframeFilter[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                  timeframe === tf
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {timeframeLabels[tf]}
              </button>
            ))}
          </div>

          {/* Primary Action Button: Add Installment */}
          <Link href="/installments?new=true">
            <Button size="sm" className="gap-1.5 shadow-xs cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>เพิ่มรายการผ่อน</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION B — Essential Financial Summary (4 KPI Cards) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: ยอดคงเหลือที่ต้องชำระ (Remaining Debt) */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              ยอดคงเหลือที่ต้องชำระ
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(d.totalRemainingAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              จากยอดรวมทั้งหมด {formatCurrency(d.totalInstallmentAmount)}
            </p>
          </div>
        </Card>

        {/* Card 2: ยอดค้างชำระ (Overdue) - Subtle Warning Style */}
        <Card
          className={cn(
            "p-4 sm:p-5 flex flex-col justify-between transition-colors",
            d.totalOverdueAmount > 0
              ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60"
              : "hover:border-emerald-500/40"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              ยอดค้างชำระ
            </span>
            <div
              className={cn(
                "p-2 rounded-xl",
                d.totalOverdueAmount > 0
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {d.totalOverdueAmount > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={cn(
                "text-xl sm:text-2xl font-bold",
                d.totalOverdueAmount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {formatCurrency(d.totalOverdueAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {d.totalOverdueAmount > 0
                ? `เกินกำหนด ${d.overduePayments.length} รายการ`
                : "ไม่มีรายการค้างชำระ ปกติสมบูรณ์"}
            </p>
          </div>
        </Card>

        {/* Card 3: ยอดที่ชำระแล้ว (Paid Amount in this period) */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              ยอดที่ชำระแล้ว
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(d.period.paidAmount)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>รอบ {d.period.label}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {d.period.paidPercentage}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, d.period.paidPercentage)}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Card 4: สัญญาที่กำลังผ่อน (Active Installments Count) */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-violet-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              สัญญาที่กำลังผ่อน
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {d.activeInstallmentsCount} สัญญา
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              ส่วนตัว {d.personalInstallmentsCount} • ผ่อนร่วม {d.sharedInstallmentsCount}
            </p>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION C & D & E — Main Layout Grid */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Payments & Shared Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Section (Shown if any exist) */}
          {d.overduePayments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" />
                <h3 className="text-sm sm:text-base font-bold">
                  รายการเกินกำหนดชำระ ({d.overduePayments.length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {d.overduePayments.map((item) => (
                  <Card
                    key={item.id}
                    className="p-3.5 sm:p-4 border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <ProviderIcon slug={item.provider.slug} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {item.installmentName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (งวด {item.installmentNumber}/{item.totalInstallments})
                          </span>
                          <Badge variant="overdue" className="text-[10px] py-0">
                            เกินกำหนด {item.daysOverdue} วัน
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{item.provider.name}</span>
                          <span>•</span>
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            ครบกำหนด: {item.dueDateFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(item.myShareAmount)}
                        </div>
                        {item.totalAmount !== item.myShareAmount && (
                          <span className="text-[11px] text-muted-foreground block">
                            ยอดเต็ม {formatCurrency(item.totalAmount)}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setConfirmTarget({
                            paymentId: item.id,
                            installmentName: item.installmentName,
                            installmentNumber: item.installmentNumber,
                            totalInstallments: item.totalInstallments,
                            amount: item.myShareAmount,
                          })
                        }
                        className="text-xs h-8 px-3 gap-1.5 cursor-pointer"
                      >
                        <span>จ่ายแล้ว</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Payments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  รายการที่ต้องชำระเร็วๆ นี้
                </h3>
              </div>
              <Link
                href="/installments"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                <span>ดูทั้งหมด ({d.activeInstallmentsCount} สัญญา)</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {d.upcomingPayments.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground text-sm rounded-2xl">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>ไม่มีรายการที่ต้องชำระเร็วๆ นี้</p>
                <Link href="/calendar" className="inline-block mt-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    ดูปฏิทินรอบบิล
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {d.upcomingPayments.slice(0, 5).map((item) => {
                  const isDueToday = item.daysRemaining === 0;

                  return (
                    <Card
                      key={item.id}
                      className="p-3.5 sm:p-4 hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                          <ProviderIcon slug={item.provider.slug} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {item.installmentName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (งวด {item.installmentNumber}/{item.totalInstallments})
                            </span>
                            <Badge
                              variant={
                                item.ownershipType === "SHARED" ? "shared" : "personal"
                              }
                              className="text-[10px] py-0 px-1.5"
                            >
                              {formatSplitDisplayThai(item.splitDisplay, item.ownershipType)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{item.provider.name}</span>
                            <span>•</span>
                            <span
                              className={
                                isDueToday
                                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                                  : ""
                              }
                            >
                              ครบกำหนด: {item.dueDateFormatted}
                              {isDueToday
                                ? " (ครบกำหนดวันนี้)"
                                : ` (อีก ${item.daysRemaining} วัน)`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-bold text-foreground">
                            {formatCurrency(item.myShareAmount)}
                          </div>
                          {item.totalAmount !== item.myShareAmount && (
                            <span className="text-[11px] text-muted-foreground block">
                              ยอดเต็ม {formatCurrency(item.totalAmount)}
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={isDueToday ? "default" : "outline"}
                          onClick={() =>
                            setConfirmTarget({
                              paymentId: item.id,
                              installmentName: item.installmentName,
                              installmentNumber: item.installmentNumber,
                              totalInstallments: item.totalInstallments,
                              amount: item.myShareAmount,
                            })
                          }
                          className="text-xs h-8 px-3 gap-1.5 cursor-pointer"
                        >
                          <span>จ่ายแล้ว</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION D — Shared Settlement Summary Card */}
          {d.netSettlement.hasSharedData && (
            <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-background to-primary/10 rounded-2xl">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded-md bg-violet-600 text-white">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      ระบบคำนวณยอดเคลียร์ระหว่าง 2 คน
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">
                    {d.netSettlement.summaryText}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {d.netSettlement.breakdownText}
                  </p>
                </div>

                <Link href="/shared" className="shrink-0 pt-1 sm:pt-0">
                  <Button size="sm" variant="outline" className="text-xs cursor-pointer">
                    ดูรายละเอียดแบ่งจ่าย
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column (1 Col): Single Compact Chart & Active Progress */}
        <div className="space-y-6">
          {/* Section E — Single Compact Monthly Trend Chart */}
          <DashboardCharts monthlyTrend={d.monthlyTrend} />

          {/* Section F — Active Installments Progress List */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                ความคืบหน้าสัญญาผ่อน
              </h4>
              <Link
                href="/installments"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <span>ดูทั้งหมด</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {d.installmentProgress.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                ยังไม่มีสัญญาผ่อนที่กำลังดำเนินการ
              </p>
            ) : (
              <div className="space-y-3">
                {d.installmentProgress.slice(0, 4).map((inst) => (
                  <div
                    key={inst.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground truncate max-w-[140px]">
                        {inst.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        งวด {inst.paidInstallments}/{inst.totalInstallments}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>ผ่อนแล้ว {formatCurrency(inst.paidAmount)}</span>
                      <span className="font-bold text-foreground">{inst.progressPercent}%</span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${inst.progressPercent}%` }}
                      />
                    </div>

                    {inst.nextDueDate && (
                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        งวดถัดไป: {inst.nextDueDate}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Payment Confirmation Dialog (Preserved & Reusable) */}
      <PaymentConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(op) => !op && setConfirmTarget(null)}
        target={confirmTarget}
        onSuccess={() => fetchDashboardData(timeframe)}
      />
    </div>
  );
}
