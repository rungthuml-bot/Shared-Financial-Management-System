"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { ProviderIcon } from "@/components/ui/provider-icon";
import { getCalendarDataAction } from "@/actions/calendar.actions";
import { CalendarEventDialog } from "@/features/calendar/calendar-event-dialog";
import type {
  CalendarData,
  CalendarEventItem,
  CalendarFilterInput,
} from "@/services/calendar.service";
import type { PaymentStatus, OwnershipType } from "@prisma/client";

export default function CalendarPage() {
  const now = new Date();
  const [currentYear, setCurrentYear] = React.useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = React.useState(now.getMonth() + 1); // 1-12

  // Filters
  const [ownershipFilter, setOwnershipFilter] = React.useState<"ALL" | OwnershipType>("ALL");
  const [providerFilter, setProviderFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | PaymentStatus>("ALL");

  // State
  const [calendarData, setCalendarData] = React.useState<CalendarData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Selected event dialog
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEventItem | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const fetchCalendar = React.useCallback(
    async (y: number, m: number, filters: Partial<CalendarFilterInput> = {}) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getCalendarDataAction({
          year: y,
          month: m,
          ownershipType: filters.ownershipType || ownershipFilter,
          providerId: filters.providerId || providerFilter,
          categoryId: filters.categoryId || categoryFilter,
          status: filters.status || statusFilter,
        });

        if (res.success && res.data) {
          setCalendarData(res.data);
        } else {
          setErrorMsg(!res.success ? res.error : "ไม่สามารถโหลดข้อมูลปฏิทินได้");
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    },
    [ownershipFilter, providerFilter, categoryFilter, statusFilter]
  );

  React.useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const res = await getCalendarDataAction({
          year: currentYear,
          month: currentMonth,
          ownershipType: ownershipFilter,
          providerId: providerFilter,
          categoryId: categoryFilter,
          status: statusFilter,
        });

        if (ignore) return;
        if (res.success && res.data) {
          setCalendarData(res.data);
        } else {
          setErrorMsg(!res.success ? res.error : "ไม่สามารถโหลดข้อมูลปฏิทินได้");
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
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
  }, [currentYear, currentMonth, ownershipFilter, providerFilter, categoryFilter, statusFilter]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  const openEvent = (event: CalendarEventItem) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const daysOfWeek = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const isToday = (day: number) => {
    return (
      now.getFullYear() === currentYear &&
      now.getMonth() + 1 === currentMonth &&
      now.getDate() === day
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header & Month Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span>ปฏิทินการชำระเงิน</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            ติดตามกำหนดชำระค่างวดรายวันและวางแผนสภาพคล่องทางการเงิน
          </p>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs">
            วันนี้
          </Button>
          <div className="flex items-center rounded-lg border border-border bg-card shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={handlePrevMonth}
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[130px] text-center text-xs sm:text-sm font-semibold text-foreground px-2">
              {calendarData ? calendarData.monthName : `${currentMonth}/${currentYear}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleNextMonth}
              title="เดือนถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>ตัวกรอง:</span>
          </div>

          {/* Ownership Filter */}
          <select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as "ALL" | OwnershipType)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">ประเภททั้งหมด</option>
            <option value="PERSONAL">ผ่อนส่วนตัว (Personal)</option>
            <option value="SHARED">ผ่อนร่วมกัน (Shared)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | PaymentStatus)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="UPCOMING">รอชำระ (Upcoming)</option>
            <option value="DUE">ครบกำหนดวันนี้ (Due)</option>
            <option value="OVERDUE">เกินกำหนด (Overdue)</option>
            <option value="PAID">ชำระแล้ว (Paid)</option>
          </select>

          {/* Provider Filter */}
          {calendarData && (
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">ผู้ให้บริการทั้งหมด</option>
              {calendarData.filterOptions.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Category Filter */}
          {calendarData && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">หมวดหมู่ทั้งหมด</option>
              {calendarData.filterOptions.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters button */}
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

      {/* Main Grid: Calendar Grid & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Monthly Grid (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4 sm:p-5 overflow-hidden">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-muted-foreground">
              {daysOfWeek.map((d, idx) => (
                <div
                  key={d}
                  className={`py-1.5 ${
                    idx === 0
                      ? "text-rose-500 font-bold"
                      : idx === 6
                      ? "text-blue-500 font-bold"
                      : ""
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {loading && !calendarData ? (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="min-h-[90px] rounded-lg" />
                ))}
              </div>
            ) : errorMsg && !calendarData ? (
              <div className="p-8 text-center text-sm text-rose-500">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Blank days before 1st of month */}
                {Array.from({ length: calendarData?.firstDayOfWeek || 0 }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[85px] sm:min-h-[105px] rounded-lg bg-muted/20 border border-transparent p-1"
                  />
                ))}

                {/* Day cells */}
                {calendarData?.days.map((dayData) => {
                  const today = isToday(dayData.day);
                  const hasEvents = dayData.events.length > 0;

                  return (
                    <div
                      key={dayData.day}
                      className={`min-h-[85px] sm:min-h-[105px] rounded-lg border transition-all p-1.5 flex flex-col justify-between ${
                        today
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : hasEvents
                          ? "border-border bg-card hover:border-primary/40"
                          : "border-border/40 bg-card/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold inline-flex items-center justify-center h-5 w-5 rounded-full ${
                            today
                              ? "bg-primary text-primary-foreground font-bold"
                              : "text-foreground"
                          }`}
                        >
                          {dayData.day}
                        </span>

                        {hasEvents && (
                          <span className="text-[10px] font-semibold text-muted-foreground hidden sm:inline">
                            {formatCurrency(dayData.totalAmount)}
                          </span>
                        )}
                      </div>

                      {/* Payment items in day */}
                      <div className="space-y-1 my-1 overflow-hidden">
                        {dayData.events.slice(0, 3).map((ev) => {
                          const isPaid = ev.status === "PAID";
                          const isOverdue = ev.status === "OVERDUE";
                          const isDue = ev.status === "DUE";

                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => openEvent(ev)}
                              className={`w-full text-left rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate block transition-all ${
                                isPaid
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                                  : isOverdue
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 font-semibold"
                                  : isDue
                                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-400 hover:bg-amber-500/25 font-semibold"
                                  : "bg-primary/10 text-primary hover:bg-primary/20"
                              }`}
                              title={`${ev.title} - ${formatCurrency(ev.myShare)}`}
                            >
                              <span className="truncate">{ev.title}</span>
                            </button>
                          );
                        })}

                        {dayData.events.length > 3 && (
                          <span className="text-[9px] text-muted-foreground font-medium pl-1 block">
                            +{dayData.events.length - 3} รายการ
                          </span>
                        )}
                      </div>

                      {/* Bottom status dots on mobile */}
                      {hasEvents && (
                        <div className="flex items-center gap-1 sm:hidden">
                          {dayData.hasOverdue && (
                            <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          )}
                          {dayData.hasDue && (
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          )}
                          <span className="text-[9px] text-muted-foreground">
                            {dayData.events.length}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Panel: Summary, Upcoming & Overdue (1 Col) */}
        <div className="space-y-4">
          {/* Month Summary Card */}
          {calendarData && (
            <Card className="p-4 sm:p-5 space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                สรุปยอดเดือนนี้ ({calendarData.monthName})
              </span>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">ยอดทั้งหมด:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(calendarData.summary.totalMonthAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">ชำระแล้ว:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(calendarData.summary.paidMonthAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-600 dark:text-blue-400">คงเหลือ:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(calendarData.summary.remainingMonthAmount)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span>จ่ายแล้ว {calendarData.summary.paidCount}/{calendarData.summary.totalEventsCount} รายการ</span>
                {calendarData.summary.overdueCount > 0 && (
                  <span className="text-rose-500 font-semibold">
                    เกินกำหนด {calendarData.summary.overdueCount}
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Overdue Payments Panel */}
          {calendarData && calendarData.overdueList.length > 0 && (
            <Card className="p-4 border-rose-500/40 bg-rose-500/5 space-y-3">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>รายการเกินกำหนด ({calendarData.overdueList.length})</span>
              </div>

              <div className="space-y-2">
                {calendarData.overdueList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openEvent(item)}
                    className="w-full text-left p-2.5 rounded-lg bg-background border border-rose-200 dark:border-rose-950/50 hover:border-rose-400 transition-all flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-foreground truncate block">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400">
                        ครบกำหนด: {item.dueDateFormatted}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                      {formatCurrency(item.myShare)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Upcoming Payments Panel */}
          {calendarData && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
                <Clock className="h-4 w-4 text-primary" />
                <span>งวดที่ใกล้ถึงกำหนดชำระ</span>
              </div>

              {calendarData.upcomingList.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  ไม่มีงวดที่ค้างชำระเร็วๆ นี้
                </div>
              ) : (
                <div className="space-y-2">
                  {calendarData.upcomingList.map((item) => {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openEvent(item)}
                        className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/40 bg-card transition-all flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                            <ProviderIcon slug={item.provider.slug} className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate block">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.dueDateFormatted}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-foreground shrink-0">
                          {formatCurrency(item.myShare)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Interactive Detail Dialog */}
      <CalendarEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        onUpdated={() => fetchCalendar(currentYear, currentMonth)}
      />
    </div>
  );
}
