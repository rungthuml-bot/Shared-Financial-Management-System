"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type {
  ReportCategoryBreakdown,
} from "@/services/report.service";

interface ReportChartsProps {
  monthlyTrend: Array<{
    month: string;
    paid: number;
    remaining: number;
    overdue: number;
    total: number;
  }>;
  categoryBreakdown: ReportCategoryBreakdown[];
}

const emptySubscribe = () => () => {};

export function ReportCharts({
  monthlyTrend,
  categoryBreakdown,
}: ReportChartsProps) {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 h-[280px] animate-pulse bg-muted/40" />
        <Card className="p-5 h-[280px] animate-pulse bg-muted/40" />
      </div>
    );
  }

  const defaultColors = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ec4899", // pink
    "#6366f1", // indigo
    "#14b8a6", // teal
  ];

  const hasTrend = monthlyTrend.some((m) => m.total > 0);
  const hasCategory = categoryBreakdown.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
      {/* 1. Monthly Trend Bar Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground">
            แนวโน้มยอดชำระรายเดือน
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            เปรียบเทียบยอดที่จ่ายแล้ว ยอดคงเหลือ และยอดค้างชำระ
          </p>
        </div>

        {!hasTrend ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
            ไม่มีข้อมูลการชำระเงินในช่วงเวลานี้
          </div>
        ) : (
          <div className="h-[220px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: number) => `฿${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    formatCurrency(typeof val === "number" ? val : 0),
                    "",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="paid" name="จ่ายแล้ว" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="remaining" name="คงเหลือ" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="overdue" name="เกินกำหนด" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value: string) => (
                    <span className="text-muted-foreground">{value}</span>
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 2. Category Distribution Donut Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground">
            สัดส่วนตามหมวดหมู่ค่าใช้จ่าย
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            แยกตามประเภทการใช้จ่ายจริง
          </p>
        </div>

        {!hasCategory ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
            ไม่มีข้อมูลหมวดหมู่ในช่วงเวลานี้
          </div>
        ) : (
          <div className="h-[220px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="totalAmount"
                  nameKey="name"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || defaultColors[index % defaultColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: unknown) => [
                    formatCurrency(typeof val === "number" ? val : 0),
                    "",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  formatter={(value: string) => (
                    <span className="text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
