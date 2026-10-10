"use client";

import * as React from "react";
import {
  FileText,
  Download,
  Printer,
  Filter,
  AlertCircle,
  ArrowLeftRight,
  Search,
  Users2,
  User,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { getReportDataAction } from "@/actions/report.actions";
import { downloadReportCSV } from "@/lib/export-csv";
import { ReportCharts } from "@/features/reports/report-charts";
import { ProviderIcon } from "@/components/ui/provider-icon";
import { getPaymentStatusLabel, formatSplitDisplayThai } from "@/lib/status-utils";
import type {
  ReportData,
  ReportFilterInput,
  ReportPeriod,
} from "@/services/report.service";
import type { PaymentStatus, OwnershipType } from "@prisma/client";

export default function ReportsPage() {
  const [period, setPeriod] = React.useState<ReportPeriod>("this_month");
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");
  const [ownershipFilter, setOwnershipFilter] = React.useState<"ALL" | OwnershipType>("ALL");
  const [providerFilter, setProviderFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | PaymentStatus>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchReport = React.useCallback(async (f: ReportFilterInput) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getReportDataAction(f);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        setErrorMsg(!res.success ? res.error : "ไม่สามารถโหลดข้อมูลรายงานได้");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดรายงาน");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const res = await getReportDataAction({
          period,
          customStartDate: customStart || undefined,
          customEndDate: customEnd || undefined,
          ownershipType: ownershipFilter,
          providerId: providerFilter,
          categoryId: categoryFilter,
          status: statusFilter,
        });

        if (ignore) return;
        if (res.success && res.data) {
          setReportData(res.data);
        } else {
          setErrorMsg(!res.success ? res.error : "ไม่สามารถโหลดข้อมูลรายงานได้");
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดรายงาน");
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
  }, [period, customStart, customEnd, ownershipFilter, providerFilter, categoryFilter, statusFilter]);

  const handleExportCSV = () => {
    if (!reportData || reportData.tableRows.length === 0) {
      toast.info("ไม่มีรายการข้อมูลสำหรับส่งออก CSV");
      return;
    }

    const dateSlug = new Date().toISOString().split("T")[0];
    const filename = `installment-report-${period}-${dateSlug}.csv`;
    downloadReportCSV(filteredRows, filename);
    toast.success(`ส่งออกไฟล์ "${filename}" สำเร็จ`);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const filteredRows =
    !reportData
      ? []
      : !searchQuery
      ? reportData.tableRows
      : reportData.tableRows.filter((r) => {
          const q = searchQuery.toLowerCase();
          return (
            r.installmentName.toLowerCase().includes(q) ||
            r.provider.name.toLowerCase().includes(q) ||
            (r.category && r.category.name.toLowerCase().includes(q))
          );
        });

  if (loading && !reportData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (errorMsg && !reportData) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">ไม่สามารถโหลดรายงานได้</h3>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Button
          onClick={() =>
            fetchReport({
              period,
              customStartDate: customStart,
              customEndDate: customEnd,
              ownershipType: ownershipFilter,
              providerId: providerFilter,
              categoryId: categoryFilter,
              status: statusFilter,
            })
          }
          variant="outline"
        >
          ลองใหม่อีกครั้ง
        </Button>
      </div>
    );
  }

  const d = reportData!;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header & Export Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span>รายงานและสถิติภาพรวม</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            รอบข้อมูล: <span className="font-semibold text-foreground">{d.periodLabel}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>ส่งออก CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์รายงาน / PDF</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden on Print) */}
      <Card className="p-4 space-y-3 print:hidden">
        {/* Period Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">ช่วงเวลา:</span>
          {(
            [
              ["this_month", "เดือนนี้"],
              ["last_month", "เดือนที่แล้ว"],
              ["last_3_months", "3 เดือนล่าสุด"],
              ["this_year", "ปีนี้"],
              ["all_time", "ทั้งหมด"],
              ["custom", "กำหนดเอง"],
            ] as [ReportPeriod, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPeriod(val)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                period === val
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Inputs if selected */}
        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">ตั้งแต่วันที่:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">ถึงวันที่:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border text-xs">
          <div className="flex items-center gap-1 text-muted-foreground font-medium">
            <Filter className="h-3 w-3" />
            <span>ตัวกรอง:</span>
          </div>

          <select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as "ALL" | OwnershipType)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
          >
            <option value="ALL">ประเภททั้งหมด</option>
            <option value="PERSONAL">ส่วนตัว</option>
            <option value="SHARED">ผ่อนร่วม</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | PaymentStatus)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="UPCOMING">ยังไม่ถึงกำหนด</option>
            <option value="DUE">ถึงกำหนดชำระ</option>
            <option value="OVERDUE">เกินกำหนด</option>
            <option value="PAID">ชำระแล้ว</option>
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
          >
            <option value="ALL">ผู้ให้บริการทั้งหมด</option>
            {d.filterOptions.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
          >
            <option value="ALL">หมวดหมู่ทั้งหมด</option>
            {d.filterOptions.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {(ownershipFilter !== "ALL" ||
            statusFilter !== "ALL" ||
            providerFilter !== "ALL" ||
            categoryFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOwnershipFilter("ALL");
                setStatusFilter("ALL");
                setProviderFilter("ALL");
                setCategoryFilter("ALL");
              }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              ล้างตัวกรอง
            </Button>
          )}
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:grid-cols-4">
        {/* Total Amount */}
        <Card className="p-4 sm:p-5">
          <span className="text-xs font-medium text-muted-foreground block">
            มูลค่างวดในรอบนี้
          </span>
          <div className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">
            {formatCurrency(d.summary.totalInstallmentAmount)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            ทั้งหมด {d.summary.totalPaymentsCount} รายการ
          </span>
        </Card>

        {/* Paid Amount */}
        <Card className="p-4 sm:p-5">
          <span className="text-xs font-medium text-muted-foreground block">
            ชำระแล้วสะสม
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {formatCurrency(d.summary.totalPaidAmount)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            ชำระแล้ว {d.summary.paidPaymentsCount} งวด
          </span>
        </Card>

        {/* Remaining Amount */}
        <Card className="p-4 sm:p-5">
          <span className="text-xs font-medium text-muted-foreground block">
            คงเหลือที่ต้องจ่าย
          </span>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">
            {formatCurrency(d.summary.totalRemainingAmount)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            เหลืออีก {d.summary.remainingPaymentsCount} งวด
          </span>
        </Card>

        {/* Overdue Amount */}
        <Card className="p-4 sm:p-5">
          <span className="text-xs font-medium text-muted-foreground block">
            ยอดเกินกำหนดชำระ
          </span>
          <div
            className={`text-xl sm:text-2xl font-bold mt-1.5 ${
              d.summary.totalOverdueAmount > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatCurrency(d.summary.totalOverdueAmount)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {d.summary.totalOverdueAmount > 0 ? "มีรายการค้างชำระ" : "ไม่มีหนี้ค้างชำระ"}
          </span>
        </Card>
      </div>

      {/* Personal vs Shared & Shared Settlement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
        {/* Personal vs Shared Comparison */}
        <Card className="p-5 space-y-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>เปรียบเทียบภาระ: ส่วนตัว vs ผ่อนร่วม</span>
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Personal Box */}
            <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                <User className="h-4 w-4" />
                <span>ส่วนตัว (Personal)</span>
              </div>
              <div className="text-base font-bold text-foreground">
                {formatCurrency(d.personalVsShared.personal.totalAmount)}
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <div>จ่ายแล้ว: {formatCurrency(d.personalVsShared.personal.paidAmount)}</div>
                <div>คงเหลือ: {formatCurrency(d.personalVsShared.personal.remainingAmount)}</div>
                <div>{d.personalVsShared.personal.count} งวด</div>
              </div>
            </div>

            {/* Shared Box */}
            <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-semibold">
                <Users2 className="h-4 w-4" />
                <span>ผ่อนร่วม (Shared)</span>
              </div>
              <div className="text-base font-bold text-foreground">
                {formatCurrency(d.personalVsShared.shared.totalAmount)}
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <div>จ่ายแล้ว: {formatCurrency(d.personalVsShared.shared.paidAmount)}</div>
                <div>คงเหลือ: {formatCurrency(d.personalVsShared.shared.remainingAmount)}</div>
                <div>{d.personalVsShared.shared.count} งวด</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Shared Net Settlement Summary Card */}
        <Card className="p-5 space-y-3 border-violet-500/30 bg-gradient-to-r from-violet-500/5 via-background to-primary/5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-violet-600 text-white">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              ยอดเคลียร์ระหว่าง 2 คน (Net Settlement)
            </h4>
          </div>

          <div className="text-base font-bold text-foreground">
            {d.netSettlement.summaryText}
          </div>
          <p className="text-xs text-muted-foreground">
            {d.netSettlement.breakdownText}
          </p>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>สถานะ: {d.netSettlement.direction === "none" || d.netSettlement.direction === "settled" ? "เคลียร์สมบูรณ์" : "มียอดค้างระหว่างกัน"}</span>
            <span>รายการค้างเคลียร์ {d.netSettlement.pendingCount} รายการ</span>
          </div>
        </Card>
      </div>

      {/* Visual Charts */}
      <ReportCharts
        monthlyTrend={d.monthlyTrend}
        categoryBreakdown={d.categoryBreakdown}
      />

      {/* Provider Breakdown Cards */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          สรุปแยกตามผู้ให้บริการ (Provider Breakdown)
        </h4>

        {d.providerBreakdown.length === 0 ? (
          <Card className="p-6 text-center text-xs text-muted-foreground">
            ไม่มีข้อมูลผู้ให้บริการในช่วงเวลานี้
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
            {d.providerBreakdown.map((p) => {
              return (
                <Card key={p.providerId} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
                        <ProviderIcon slug={p.slug} className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold text-xs text-foreground">{p.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {p.paymentCount} งวด
                    </Badge>
                  </div>

                  <div className="text-base font-bold text-foreground">
                    {formatCurrency(p.totalAmount)}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      จ่ายแล้ว {formatCurrency(p.paidAmount)}
                    </span>
                    <span>เหลือ {formatCurrency(p.remainingAmount)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Report Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <h4 className="text-sm font-semibold text-foreground">
            ตารางรายการชำระเงินละเอียด ({filteredRows.length} รายการ)
          </h4>

          {/* Search Table */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาชื่อรายการ, ผู้ให้บริการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <Card className="overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-3">วันครบกำหนด</th>
                  <th className="py-3 px-3">รายการผ่อน</th>
                  <th className="py-3 px-3">ผู้ให้บริการ</th>
                  <th className="py-3 px-3">หมวดหมู่</th>
                  <th className="py-3 px-3 text-center">งวด</th>
                  <th className="py-3 px-3 text-right">ยอดเต็ม</th>
                  <th className="py-3 px-3 text-right">ส่วนของฉัน</th>
                  <th className="py-3 px-3">สถานะ</th>
                  <th className="py-3 px-3">วันที่ชำระ</th>
                  <th className="py-3 px-3">ประเภท</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
                      <Inbox className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                      ไม่พบข้อมูลรายการที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const isPaid = r.status === "PAID";
                    const isOverdue = r.status === "OVERDUE";
                    const isDue = r.status === "DUE";

                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
                          {r.dueDateFormatted}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                          {r.installmentName}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {r.provider.name}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {r.category?.name || "ทั่วไป"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium whitespace-nowrap">
                          {r.installmentNumber}/{r.totalInstallments}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground whitespace-nowrap">
                          {formatCurrency(r.myShare)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
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
                            className="text-[10px]"
                          >
                            {getPaymentStatusLabel(r.status)}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {r.paidAtFormatted || "-"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge
                            variant={r.ownershipType === "SHARED" ? "shared" : "personal"}
                            className="text-[10px]"
                          >
                            {formatSplitDisplayThai(r.splitDisplay, r.ownershipType)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
