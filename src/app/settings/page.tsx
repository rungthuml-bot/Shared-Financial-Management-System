"use client";

import {
  Users2,
  Bell,
  Palette,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { getCurrentUserAction, type GetCurrentUserResult } from "@/actions/auth.actions";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = React.useState<GetCurrentUserResult["user"]>(null);

  React.useEffect(() => {
    getCurrentUserAction().then((res) => {
      if (res.success && res.user) {
        setCurrentUser(res.user);
      }
    });
  }, []);

  const displayName = currentUser?.name ?? "ผู้ใช้งาน";
  const displayEmail = currentUser?.email ?? "กำลังโหลด...";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in-50 duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          การตั้งค่าระบบ (Settings)
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          จัดการบัญชีของคุณ การเชื่อมต่อกับคู่แชร์ และการแจ้งเตือน
        </p>
      </div>

      {/* Account Profile Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{displayName}</h3>
              <Badge variant="outline" className="text-xs">
                {currentUser?.isMock ? "โหมดทดสอบ (Mock)" : "บัญชีหลัก"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{displayEmail}</p>
            <p className="text-xs text-muted-foreground">เข้าสู่ระบบด้วย อีเมล + รหัสผ่าน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">ชื่อที่แสดง</label>
            <input
              type="text"
              key={displayName}
              defaultValue={displayName}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">อีเมล</label>
            <input
              type="email"
              disabled
              key={displayEmail}
              defaultValue={displayEmail}
              className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={() => toast.success("บันทึกข้อมูลส่วนตัวเรียบร้อย")}>
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      </Card>

      {/* Partner Link Card (2-User connection) */}
      <Card className="p-6 space-y-4 border-violet-500/30 bg-violet-500/5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-base font-bold text-foreground">
                การเชื่อมต่อบัญชีคู่แชร์ (Partner Sync)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              เชื่อมต่อกับ User B เพื่อแชร์รายการผ่อน คำนวณส่วนแบ่งอัตโนมัติ และติดตามยอดเคลียร์
            </p>
          </div>
          <Badge variant="shared" className="text-xs">เชื่อมต่อแล้ว</Badge>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-violet-500/30">
              <AvatarFallback className="bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs">
                UB
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-sm text-foreground">User B</div>
              <div className="text-xs text-muted-foreground">userB@example.com</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10">
            ตัดการเชื่อมต่อ
          </Button>
        </div>
      </Card>

      {/* Appearance / Theme Settings */}
      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">ธีมและการแสดงผล</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            เลือกธีมที่สบายตาสำหรับคุณ (รองรับ Dark Mode และ Light Mode)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === "light"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-semibold"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Sun className="h-5 w-5 text-amber-500" />
            <span className="text-xs">โหมดสว่าง (Light)</span>
          </button>

          <button
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === "dark"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-semibold"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Moon className="h-5 w-5 text-indigo-400" />
            <span className="text-xs">โหมดมืด (Dark)</span>
          </button>

          <button
            onClick={() => setTheme("system")}
            className={`p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === "system"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-semibold"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Laptop className="h-5 w-5 text-slate-500" />
            <span className="text-xs">ตามระบบ (System)</span>
          </button>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">การแจ้งเตือนรอบบิล</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            กำหนดให้ระบบแจ้งเตือนเมื่อใกล้ถึงกำหนดชำระเพื่อป้องกันการลืม
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between py-2 border-b border-border/50 text-xs">
            <div>
              <span className="font-semibold text-foreground block">
                แจ้งเตือนล่วงหน้า 3 วันก่อนถึงกำหนด
              </span>
              <span className="text-muted-foreground">
                ส่งการแจ้งเตือนไปยังแอปและอีเมล
              </span>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-primary cursor-pointer" />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/50 text-xs">
            <div>
              <span className="font-semibold text-foreground block">
                แจ้งเตือนเมื่อคู่แชร์ชำระเงินส่วนของตนเอง
              </span>
              <span className="text-muted-foreground">
                อัปเดตสถานะแบบเรียลไทม์
              </span>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-primary cursor-pointer" />
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <div>
              <span className="font-semibold text-foreground block">
                สรุปยอดรอบบิลสิ้นเดือน
              </span>
              <span className="text-muted-foreground">
                สรุปยอดรวมที่ต้องเคลียร์ในเดือนถัดไป
              </span>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-primary cursor-pointer" />
          </div>
        </div>
      </Card>
    </div>
  );
}
