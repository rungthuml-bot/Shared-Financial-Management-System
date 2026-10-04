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

interface DashboardChartsProps {
  monthlyTrend: Array<{
    month: string;
    paid: number;
    remaining: number;
    total: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

const emptySubscribe = () => () => {};

export function DashboardCharts({
  monthlyTrend,
  categoryDistribution,
}: DashboardChartsProps) {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Card className="p-5 h-[260px] animate-pulse bg-muted/40" />
        <Card className="p-5 h-[260px] animate-pulse bg-muted/40" />
      </div>
    );
  }

  const hasTrendData = monthlyTrend.some((m) => m.total > 0);
  const hasCategoryData = categoryDistribution.some((c) => c.value > 0);

  const defaultColors = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ec4899", // pink
    "#6366f1", // indigo
    "#14b8a6", // teal
  ];

  return (
    <div className="space-y-4">
      {/* 1. Monthly Trend Bar Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              แนวโน้มยอดชำระรายเดือน
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              เปรียบเทียบยอดที่จ่ายแล้วและยอดคงเหลือ
            </p>
          </div>
        </div>

        {!hasTrendData ? (
          <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
            ยังไม่มีข้อมูลยอดผ่อนในรอบเดือนนี้
          </div>
        ) : (
          <div className="h-[200px] w-full text-xs">
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
                <Bar
                  dataKey="paid"
                  name="จ่ายแล้ว"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="remaining"
                  name="คงเหลือ"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              สัดส่วนตามหมวดหมู่
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              การกระจายตัวของสัญญาผ่อนชำระ
            </p>
          </div>
        </div>

        {!hasCategoryData ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
            ยังไม่มีข้อมูลหมวดหมู่
          </div>
        ) : (
          <div className="h-[180px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
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
                  wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
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
