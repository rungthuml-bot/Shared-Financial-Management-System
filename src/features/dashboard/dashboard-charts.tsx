"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface DashboardChartsProps {
  monthlyTrend: Array<{
    month: string;
    paid: number;
    remaining: number;
    total: number;
  }>;
}

const emptySubscribe = () => () => {};

export function DashboardCharts({ monthlyTrend }: DashboardChartsProps) {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return <Card className="p-5 h-[280px] animate-pulse bg-muted/40" />;
  }

  const hasTrendData = monthlyTrend.some((m) => m.total > 0);

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                แนวโน้มยอดชำระรายเดือน
              </h4>
              <p className="text-[11px] text-muted-foreground">
                เปรียบเทียบยอดจ่ายแล้วและยอดคงเหลือ
              </p>
            </div>
          </div>
        </div>

        {!hasTrendData ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
            ยังไม่มีข้อมูลยอดผ่อนในรอบเดือนนี้
          </div>
        ) : (
          <div className="h-[180px] w-full text-xs">
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
      </div>

      <div className="pt-3 mt-3 border-t border-border/60">
        <Link href="/reports">
          <Button variant="ghost" size="sm" className="w-full text-xs justify-between h-8 hover:bg-muted/70">
            <span>ดูรายงานและสถิติทั้งหมด</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
