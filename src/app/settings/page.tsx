"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Users2,
  Bell,
  Palette,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Info,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSettingsPageDataAction,
  updateProfileNameAction,
  type SettingsPageData,
  type ConnectedPartnerData,
} from "@/actions/profile.actions";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // Settings Data State
  const [data, setData] = React.useState<SettingsPageData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Edit Name State
  const [nameInput, setNameInput] = React.useState("");
  const [isSavingName, setIsSavingName] = React.useState(false);
  const [nameValidationErr, setNameValidationErr] = React.useState<string | null>(null);

  // Partner Disconnection Info Dialog State
  const [selectedPartnerForDisconnect, setSelectedPartnerForDisconnect] =
    React.useState<ConnectedPartnerData | null>(null);

  // Load real profile and partner data on mount
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await getSettingsPageDataAction();
      if (res.success) {
        setData(res.data);
        setNameInput(res.data.profile.name);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลการตั้งค่า"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const res = await getSettingsPageDataAction();
        if (ignore) return;
        if (res.success) {
          setData(res.data);
          setNameInput(res.data.profile.name);
        } else {
          setErrorMsg(res.error);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลการตั้งค่า"
          );
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

  // Handle Display Name Change
  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(val);
    const trimmed = val.trim();
    if (trimmed.length === 0) {
      setNameValidationErr("ชื่อที่แสดงต้องไม่เป็นค่าว่าง");
    } else if (trimmed.length < 2) {
      setNameValidationErr("ชื่อที่แสดงต้องมีความยาวอย่างน้อย 2 ตัวอักษร");
    } else if (trimmed.length > 50) {
      setNameValidationErr("ชื่อที่แสดงต้องไม่เกิน 50 ตัวอักษร");
    } else {
      setNameValidationErr(null);
    }
  };

  // Submit Display Name Update
  const handleSaveProfileName = async () => {
    if (isSavingName) return;

    const trimmed = nameInput.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 50) {
      toast.error("กรุณาระบุชื่อที่แสดงระหว่าง 2 ถึง 50 ตัวอักษร");
      return;
    }

    try {
      setIsSavingName(true);
      const res = await updateProfileNameAction({ name: trimmed });
      if (res.success) {
        toast.success(res.message || "บันทึกชื่อที่แสดงเรียบร้อยแล้ว");
        if (data) {
          setData({
            ...data,
            profile: {
              ...data.profile,
              name: res.data.name,
            },
          });
        }
        setNameInput(res.data.name);
        setNameValidationErr(null);
      } else {
        toast.error(res.error || "ไม่สามารถบันทึกชื่อที่แสดงได้");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูลส่วนตัว"
      );
    } finally {
      setIsSavingName(false);
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
      <div className="space-y-6 max-w-4xl animate-in fade-in-50 duration-300">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-4 max-w-xl mx-auto">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">ไม่สามารถโหลดข้อมูลการตั้งค่าได้</h3>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Button onClick={loadData} variant="outline" className="cursor-pointer">
          ลองใหม่อีกครั้ง
        </Button>
      </Card>
    );
  }

  const { profile, partners } = data;
  const isNameChanged = nameInput.trim() !== profile.name;
  const canSaveName = isNameChanged && !nameValidationErr && nameInput.trim().length >= 2;

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in-50 duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          การตั้งค่าระบบ
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          จัดการบัญชีของคุณ ตรวจสอบความสัมพันธ์คู่แชร์ และปรับแต่งการแสดงผล
        </p>
      </div>

      {/* Account Profile Card (Database-backed) */}
      <Card className="p-6 space-y-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-xs">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">{profile.name}</h3>
              <Badge variant="outline" className="text-xs">
                {profile.isMock ? "โหมดทดสอบ (Dev Mock)" : "บัญชีผู้ใช้"}
              </Badge>
              <Badge variant="secondary" className="text-[11px]">
                สิทธิ์: {profile.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            <p className="text-[11px] text-muted-foreground">
              เข้าสู่ระบบด้วย อีเมล + รหัสผ่าน
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
          {/* Display Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-name" className="text-xs font-semibold text-muted-foreground">
              ชื่อที่แสดง (Display Name)
            </Label>
            <Input
              id="profile-name"
              type="text"
              value={nameInput}
              onChange={handleNameInputChange}
              disabled={isSavingName}
              placeholder="ระบุชื่อที่แสดงในระบบ"
              className="text-sm"
            />
            {nameValidationErr && (
              <p className="text-[11px] text-destructive">{nameValidationErr}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              ชื่อนี้จะแสดงในรายการผ่อนร่วมและการคำนวณยอดเคลียร์สุทธิ
            </p>
          </div>

          {/* Email Input (Read-only) */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-email" className="text-xs font-semibold text-muted-foreground">
              อีเมลบัญชี (Email)
            </Label>
            <Input
              id="profile-email"
              type="email"
              disabled
              value={profile.email}
              className="bg-muted/40 text-muted-foreground cursor-not-allowed text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              อีเมลใช้สำหรับยืนยันตัวตนเข้าระบบ ไม่สามารถแก้ไขได้โดยตรง
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={handleSaveProfileName}
            disabled={!canSaveName || isSavingName}
            className="cursor-pointer gap-2 bg-primary text-primary-foreground font-semibold"
          >
            {isSavingName ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Real Connected Partner Information */}
      <Card className="p-6 space-y-5 border-violet-500/30 bg-violet-500/5 rounded-2xl shadow-xs">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-base font-bold text-foreground">
                การเชื่อมต่อบัญชีคู่แชร์ (Connected Partners)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              ข้อมูลคู่แชร์ที่ดึงมาจากความสัมพันธ์จริงในสัญญารายการผ่อนร่วม
            </p>
          </div>
          {partners.length > 0 && (
            <Badge variant="shared" className="text-xs">
              เชื่อมต่อ {partners.length} บัญชี
            </Badge>
          )}
        </div>

        {partners.length === 0 ? (
          <div className="p-6 rounded-xl bg-card border border-border text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Users2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-foreground">
                ยังไม่มีการเชื่อมต่อกับคู่แชร์
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                คุณยังไม่มีรายการผ่อนร่วมกับผู้ใช้งานอื่น เมื่อคุณสร้างรายการผ่อนร่วมและระบุคู่แชร์
                ระบบจะแสดงข้อมูลคู่แชร์ของคุณที่นี่โดยอัตโนมัติ
              </p>
            </div>
            <Link href="/installments?new=true">
              <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer mt-1">
                <Plus className="h-3.5 w-3.5" />
                <span>สร้างรายการผ่อนร่วม</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <Avatar className="h-11 w-11 border border-violet-500/30 shadow-2xs">
                    <AvatarFallback className="bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-sm">
                      {getInitials(partner.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {partner.name}
                      </span>
                      <Badge variant="shared" className="text-[10px] py-0 px-1.5 font-normal">
                        คู่แชร์ในระบบ
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{partner.email}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>สัญญาร่วม {partner.sharedContractsCount} รายการ</span>
                      {partner.activeContractsCount > 0 && (
                        <span>• ผ่อนอยู่ {partner.activeContractsCount} รายการ</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Partner Disconnection Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPartnerForDisconnect(partner)}
                  className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  จัดการการเชื่อมต่อ
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Appearance / Theme Settings */}
      <Card className="p-6 space-y-4 rounded-2xl shadow-xs">
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
            type="button"
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === "light"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-semibold"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Sun className="h-5 w-5 text-amber-500" />
            <span className="text-xs">โหมดสว่าง</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === "dark"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-semibold"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Moon className="h-5 w-5 text-indigo-400" />
            <span className="text-xs">โหมดมืด</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer ${
              theme === "system"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-semibold"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Laptop className="h-5 w-5 text-slate-500" />
            <span className="text-xs">ตามระบบ</span>
          </button>
        </div>
      </Card>

      {/* Notification Preferences (Honest Audit per UX-5C Scope) */}
      <Card className="p-6 space-y-4 rounded-2xl shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">การแจ้งเตือนรอบบิล</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              กำหนดให้ระบบแจ้งเตือนเมื่อใกล้ถึงกำหนดชำระเพื่อป้องกันการลืม
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
            เร็วๆ นี้ (Phase UX-5D)
          </Badge>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <span>
            ระบบกำหนดค่าการแจ้งเตือนส่วนบุคคลจะเปิดให้ใช้งานใน Phase UX-5D ร่วมกับศูนย์แจ้งเตือน (Notification Center)
            โดยในปัจจุบันระบบฐานข้อมูลยังไม่มีโมเดลจัดเก็บค่า Notification Preferences จึงปิดการตั้งค่าไว้เพื่อความถูกต้องของข้อมูล
          </span>
        </div>

        <div className="space-y-3 pt-2 opacity-60">
          <div className="flex items-center justify-between py-2 border-b border-border/50 text-xs">
            <div>
              <span className="font-semibold text-foreground block">
                แจ้งเตือนล่วงหน้า 3 วันก่อนถึงกำหนด
              </span>
              <span className="text-muted-foreground">
                ส่งการแจ้งเตือนไปยังแอปและอีเมล
              </span>
            </div>
            <input
              type="checkbox"
              disabled
              checked
              readOnly
              className="h-4 w-4 rounded accent-primary cursor-not-allowed"
            />
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
            <input
              type="checkbox"
              disabled
              checked
              readOnly
              className="h-4 w-4 rounded accent-primary cursor-not-allowed"
            />
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
            <input
              type="checkbox"
              disabled
              checked
              readOnly
              className="h-4 w-4 rounded accent-primary cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      {/* Disconnection Policy & Limitation Dialog */}
      <Dialog
        open={!!selectedPartnerForDisconnect}
        onOpenChange={(open) => {
          if (!open) setSelectedPartnerForDisconnect(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <span>นโยบายความปลอดภัยการเชื่อมต่อคู่แชร์</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              คำอธิบายเงื่อนไขและข้อจำกัดทางบัญชีสำหรับคู่แชร์: {selectedPartnerForDisconnect?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs text-muted-foreground">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1.5">
              <span className="font-bold block">
                ไม่สามารถตัดการเชื่อมต่อคู่แชร์ได้ในขณะนี้
              </span>
              <p className="leading-relaxed">
                ความสัมพันธ์ของคู่แชร์ในระบบนี้ถูกผูกไว้โดยตรงกับ{" "}
                <strong>สัญญารายการผ่อนร่วม ({selectedPartnerForDisconnect?.sharedContractsCount} รายการ)</strong>{" "}
                และประวัติการเคลียร์ยอดหนี้สุทธิ (Settlement History)
              </p>
            </div>

            <p className="leading-relaxed">
              เพื่อรักษาความถูกต้องของข้อมูลทางการเงิน ตารางงวดชำระ และส่วนแบ่งความรับผิดชอบ
              ระบบจะไม่อนุญาตให้ลบหรือปลดความสัมพันธ์ของคู่แชร์โดยพลการ
            </p>

            <div className="p-3 rounded-lg bg-muted border border-border text-[11px] space-y-1">
              <span className="font-semibold text-foreground block">
                แนวทางปฏิบัติที่ถูกต้อง:
              </span>
              <ul className="list-disc list-inside space-y-0.5">
                <li>หากต้องการสิ้นสุดการผ่อน ให้ผ่อนชำระค่างวดจนครบตามสัญญา</li>
                <li>เคลียร์ยอดคงค้างระหว่างกันในหน้ารายการผ่อนร่วมให้เป็น ฿0</li>
                <li>หากต้องการลบรายการผ่อน ให้ลบรายการผ่อนที่ยังไม่มีประวัติชำระเงิน</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedPartnerForDisconnect(null)}
              className="cursor-pointer text-xs"
            >
              รับทราบและปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
