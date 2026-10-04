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
  Sparkles,
  Inbox,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { ProviderIcon } from "@/components/ui/provider-icon";
import { getDashboardDataAction } from "@/actions/dashboard.actions";
import { markPaymentAsPaidAction } from "@/actions/payment.actions";
import { DashboardCharts } from "@/features/dashboard/dashboard-charts";
import type { DashboardData, TimeframeFilter } from "@/services/dashboard.service";

export default function DashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [timeframe, setTimeframe] = React.useState<TimeframeFilter>("this_month");
  const [payingPaymentId, setPayingPaymentId] = React.useState<string | null>(null);

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
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด"
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
            err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด"
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

  const handleQuickPay = async (paymentId: string, installmentName: string, number: number) => {
    setPayingPaymentId(paymentId);
    try {
      const res = await markPaymentAsPaidAction(paymentId);
      if (res.success) {
        toast.success(`ชำระงวดที่ #${number} ของ "${installmentName}" เรียบร้อยแล้ว`);
        await fetchDashboardData(timeframe);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setPayingPaymentId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/3 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">ไม่สามารถโหลดข้อมูลได้</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{errorMsg}</p>
        <Button onClick={() => fetchDashboardData(timeframe)} variant="outline">
          ลองใหม่อีกครั้ง
        </Button>
      </div>
    );
  }

  const d = data!;

  const timeframeLabels: Record<TimeframeFilter, string> = {
    this_month: "เดือนนี้",
    next_month: "เดือนหน้า",
    last_3_months: "3 เดือนล่าสุด",
    all_time: "ทั้งหมด",
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>ภาพรวมการผ่อนชำระ</span>
            <Sparkles className="h-5 w-5 text-amber-500 inline" />
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            รอบบิลประจำ <span className="font-semibold text-foreground">{d.period.label}</span>
          </p>
        </div>

        {/* Timeframe Filter Tabs & Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-muted p-1 text-xs">
            {(["this_month", "next_month", "last_3_months", "all_time"] as TimeframeFilter[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  timeframe === tf
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {timeframeLabels[tf]}
              </button>
            ))}
          </div>

          <Link href="/installments">
            <Button size="sm" className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>จัดการรายการ</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Due This Period */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              ยอดที่ต้องจ่าย ({d.period.label})
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(d.period.totalAmount)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>จ่ายแล้ว {d.period.paidPercentage}%</span>
              <span>เหลือ {formatCurrency(d.period.remainingAmount)}</span>
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${d.period.paidPercentage}%` }}
              />
            </div>
          </div>
        </Card>

        {/* 2. Total Remaining Across All Installments */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              ยอดหนี้คงเหลือรวม
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(d.totalRemainingAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              จากยอดรวมทั้งหมด {formatCurrency(d.totalInstallmentAmount)}
            </p>
          </div>
        </Card>

        {/* 3. Upcoming Payments Status */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              ใกล้ถึงกำหนดชำระ
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {d.period.upcomingCount + d.period.dueTodayCount} รายการ
            </div>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {d.period.dueTodayCount > 0 && (
                <Badge variant="due" className="text-[10px]">
                  วันนี้ {d.period.dueTodayCount}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                ยอดรวม {formatCurrency(d.totalUpcomingAmount + d.totalDueAmount)}
              </span>
            </div>
          </div>
        </Card>

        {/* 4. Overdue Payments Status */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              เกินกำหนดชำระ
            </span>
            <div
              className={`p-2 rounded-xl ${
                d.overduePayments.length > 0
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {d.overduePayments.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl sm:text-2xl font-bold ${
                d.overduePayments.length > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {d.overduePayments.length > 0
                ? `${d.overduePayments.length} รายการ`
                : "ไม่มีรายการค้าง"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {d.overduePayments.length > 0
                ? `ยอดค้าง ${formatCurrency(d.totalOverdueAmount)}`
                : "สถานะการชำระปกติ ยอดเยี่ยมมาก 🎉"}
            </p>
          </div>
        </Card>
      </div>

      {/* Shared Settlement Summary (Section 7 & 8) */}
      {d.netSettlement.hasSharedData && (
        <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-background to-primary/10">
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-600 text-white">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  ระบบคำนวณยอดเคลียร์ระหว่าง 2 คน (Net Settlement)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {d.netSettlement.summaryText}
              </h3>
              <p className="text-xs text-muted-foreground">
                {d.netSettlement.breakdownText}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Link href="/shared">
                <Button size="sm" variant="outline" className="text-xs">
                  ดูรายละเอียดแบ่งจ่าย
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid: Overdue, Upcoming, Active Progress & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Section (Shown if any exist) */}
          {d.overduePayments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-base font-bold">
                  รายการเกินกำหนดชำระ ({d.overduePayments.length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {d.overduePayments.map((item) => {
                  const isPaying = payingPaymentId === item.id;

                  return (
                    <Card
                      key={item.id}
                      className="p-4 border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                            <Badge variant="overdue" className="text-[10px]">
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
                            <span className="text-[11px] text-muted-foreground">
                              ยอดเต็ม {formatCurrency(item.totalAmount)}
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleQuickPay(item.id, item.installmentName, item.installmentNumber)
                          }
                          disabled={isPaying}
                          className="text-xs h-8 px-3 gap-1.5"
                        >
                          {isPaying && <Loader2 className="h-3 w-3 animate-spin" />}
                          <span>จ่ายแล้ว</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Payments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
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
              <Card className="p-8 text-center text-muted-foreground text-sm">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                ไม่มีรายการที่ต้องชำระเร็วๆ นี้
              </Card>
            ) : (
              <div className="space-y-2.5">
                {d.upcomingPayments.map((item) => {
                  const isPaying = payingPaymentId === item.id;
                  const isDueToday = item.daysRemaining === 0;

                  return (
                    <Card
                      key={item.id}
                      className="p-4 hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                              {item.splitDisplay}
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
                            <span className="text-[11px] text-muted-foreground">
                              ยอดเต็ม {formatCurrency(item.totalAmount)}
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={isDueToday ? "default" : "outline"}
                          onClick={() =>
                            handleQuickPay(item.id, item.installmentName, item.installmentNumber)
                          }
                          disabled={isPaying}
                          className="text-xs h-8 px-3 gap-1.5"
                        >
                          {isPaying && <Loader2 className="h-3 w-3 animate-spin" />}
                          <span>จ่ายแล้ว</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Installments Progress Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-foreground">
              ความคืบหน้าสัญญาผ่อนปัจจุบัน
            </h3>

            {d.installmentProgress.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                ยังไม่มีสัญญาผ่อนที่กำลังดำเนินการ
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {d.installmentProgress.map((inst) => (
                  <Card key={inst.id} className="p-4 space-y-2 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {inst.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {inst.paidInstallments}/{inst.totalInstallments} งวด
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                      <p className="text-[11px] text-muted-foreground pt-1">
                        งวดถัดไป: {inst.nextDueDate}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Charts & Ownership Distribution */}
        <div className="space-y-6">
          {/* Recharts Component */}
          <DashboardCharts
            monthlyTrend={d.monthlyTrend}
            categoryDistribution={d.categoryDistribution}
          />

          {/* Ownership Breakdown Summary Card */}
          <Card className="p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              สัดส่วนประเภทการผ่อน
            </h4>

            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-muted-foreground">ผ่อนส่วนตัว (Personal)</span>
                <span className="font-bold text-foreground">
                  {d.personalInstallmentsCount} สัญญา
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${
                      d.activeInstallmentsCount > 0
                        ? Math.round((d.personalInstallmentsCount / d.activeInstallmentsCount) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-muted-foreground">ผ่อนร่วมกัน (Shared)</span>
                <span className="font-bold text-foreground">
                  {d.sharedInstallmentsCount} สัญญา
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{
                    width: `${
                      d.activeInstallmentsCount > 0
                        ? Math.round((d.sharedInstallmentsCount / d.activeInstallmentsCount) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <Link href="/reports" className="block pt-2">
              <Button variant="ghost" className="w-full text-xs justify-between">
                <span>ดูรายงานสรุปละเอียด</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
