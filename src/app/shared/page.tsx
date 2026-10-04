"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Sparkles,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";

const SHARED_ITEMS = [
  {
    id: "sh-1",
    name: "iPad Air M2 + Apple Pencil",
    currentInstallment: "งวดที่ 3/10",
    dueDate: "5 ต.ค. 2026",
    totalAmount: 1000,
    splitMode: "50 / 50",
    userAShare: 500,
    userAStatus: "PAID",
    userBShare: 500,
    userBStatus: "PENDING",
    paidBy: "User A จ่ายเต็มจำนวนไปก่อน (฿1,000)",
    settlementImpact: "+500 ให้ User A",
  },
  {
    id: "sh-2",
    name: "เครื่องดูดฝุ่น Dyson V12",
    currentInstallment: "งวดที่ 7/10",
    dueDate: "25 ต.ค. 2026",
    totalAmount: 2190,
    splitMode: "70 / 30",
    userAShare: 1533,
    userAStatus: "PAID",
    userBShare: 657,
    userBStatus: "PAID",
    paidBy: "ต่างฝ่ายต่างโอนจ่ายตรง",
    settlementImpact: "เคลียร์เรียบร้อย",
  },
  {
    id: "sh-3",
    name: "ค่าบริการ Cloud Backup ประจำปี",
    currentInstallment: "งวดที่ 1/1",
    dueDate: "28 ก.ย. 2026",
    totalAmount: 400,
    splitMode: "50 / 50",
    userAShare: 200,
    userAStatus: "PENDING",
    userBShare: 200,
    userBStatus: "PAID",
    paidBy: "User B จ่ายเต็มจำนวนไปก่อน (฿400)",
    settlementImpact: "-200 ให้ User B",
  },
];

export default function SharedPage() {
  const [settled, setSettled] = React.useState(false);

  // Calculation details:
  // User A paid for B = 500
  // User B paid for A = 200
  // Net: User B owes User A 300
  const netAmount = 300;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            รายการผ่อนร่วม & ยอดเคลียร์ (Shared & Settlement)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            ระบบคำนวณส่วนแบ่งอัตโนมัติ 50/50 หรือตามเปอร์เซ็นต์ พร้อมยอดเคลียร์สุทธิ
          </p>
        </div>
        <Button className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>สร้างรายการผ่อนร่วม</span>
        </Button>
      </div>

      {/* Net Settlement Master Card */}
      <Card className="border-violet-500/40 bg-gradient-to-br from-violet-500/10 via-background to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/10 text-violet-600 dark:text-violet-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>การคำนวณยอดเคลียร์สุทธิ (Net Settlement)</span>
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/30">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  UA
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowLeftRight className="h-5 w-5 text-violet-500" />
              </div>
              <Avatar className="h-12 w-12 border-2 border-violet-500/30">
                <AvatarFallback className="bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                  UB
                </AvatarFallback>
              </Avatar>

              <div className="ml-2">
                <div className="text-sm font-medium text-muted-foreground">
                  ผลสรุปประจำรอบนี้
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {settled ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      เคลียร์ยอดเรียบร้อยแล้ว (฿0)
                    </span>
                  ) : (
                    <>
                      User B ต้องโอนคืน User A{" "}
                      <span className="text-violet-600 dark:text-violet-400">
                        {formatCurrency(netAmount)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 max-w-md text-xs">
              <div className="p-3 rounded-xl bg-card border border-border/80">
                <span className="text-muted-foreground block">User A ออกแทน User B:</span>
                <span className="font-bold text-foreground text-sm">฿500</span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80">
                <span className="text-muted-foreground block">User B ออกแทน User A:</span>
                <span className="font-bold text-foreground text-sm">฿200</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              disabled={settled}
              onClick={() => setSettled(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{settled ? "เคลียร์ยอดแล้ว" : "บันทึกว่าเคลียร์ยอดแล้ว"}</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              ส่งสลิป / แจ้งเตือนคู่แชร์
            </Button>
          </div>
        </div>
      </Card>

      {/* Shared Installments List with Split Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">
          รายการผ่อนร่วมในปัจจุบัน
        </h3>

        <div className="space-y-3">
          {SHARED_ITEMS.map((item) => (
            <Card key={item.id} className="p-5 hover:border-violet-500/40 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-foreground">
                      {item.name}
                    </span>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {item.currentInstallment}
                    </Badge>
                    <Badge variant="shared" className="text-xs font-semibold">
                      สัดส่วน {item.splitMode}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ยอดรวมงวดนี้: <strong className="text-foreground">{formatCurrency(item.totalAmount)}</strong> • กำหนดชำระ: {item.dueDate}
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                    {item.paidBy}
                  </p>
                </div>

                {/* Individual Split Status */}
                <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-border/50">
                  {/* User A Share */}
                  <div className="p-3 rounded-xl bg-muted/40 text-center min-w-[120px]">
                    <div className="text-[11px] text-muted-foreground font-semibold">User A</div>
                    <div className="text-sm font-bold text-foreground">
                      {formatCurrency(item.userAShare)}
                    </div>
                    <Badge
                      variant={item.userAStatus === "PAID" ? "paid" : "due"}
                      className="text-[10px] mt-1"
                    >
                      {item.userAStatus === "PAID" ? "จ่ายแล้ว" : "รอจ่าย"}
                    </Badge>
                  </div>

                  {/* User B Share */}
                  <div className="p-3 rounded-xl bg-muted/40 text-center min-w-[120px]">
                    <div className="text-[11px] text-muted-foreground font-semibold">User B</div>
                    <div className="text-sm font-bold text-foreground">
                      {formatCurrency(item.userBShare)}
                    </div>
                    <Badge
                      variant={item.userBStatus === "PAID" ? "paid" : "due"}
                      className="text-[10px] mt-1"
                    >
                      {item.userBStatus === "PAID" ? "จ่ายแล้ว" : "รอจ่าย"}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
