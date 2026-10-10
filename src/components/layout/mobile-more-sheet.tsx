"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Check,
  Loader2,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  getCurrentUserAction,
  logoutAction,
  clearDevLoggedOutAction,
} from "@/actions/auth.actions";
import { cn } from "@/lib/utils";

interface MobileMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMoreSheet({ open, onOpenChange }: MobileMoreSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [currentUser, setCurrentUser] = React.useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    isMock?: boolean;
  } | null>(null);

  const [isSwitching, setIsSwitching] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = React.useState(false);

  // Fetch real current user session when sheet opens
  React.useEffect(() => {
    if (open) {
      let mounted = true;
      getCurrentUserAction()
        .then((res) => {
          if (!mounted) return;
          if (res.success && res.user) {
            setCurrentUser(res.user);
          } else {
            setCurrentUser(null);
          }
        })
        .catch(() => {
          if (mounted) setCurrentUser(null);
        });

      return () => {
        mounted = false;
      };
    }
  }, [open]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      await logoutAction();
      toast.success("ออกจากระบบเรียบร้อย");
      setCurrentUser(null);
      setConfirmLogoutOpen(false);
      onOpenChange(false);
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาดในการออกจากระบบ");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDevSwitchUser = async (targetEmail: string, targetName: string) => {
    if (currentUser?.email === targetEmail) return;

    setIsSwitching(true);
    try {
      const res = await authClient.signIn.email({
        email: targetEmail,
        password: "Password@123",
      });

      if (res.error) {
        toast.error(`สลับไปยัง ${targetName} ไม่สำเร็จ: ${res.error.message}`);
        return;
      }

      await clearDevLoggedOutAction();
      toast.success(`สลับไปยัง ${targetName} สำเร็จ`);
      onOpenChange(false);
      router.refresh();
      window.location.reload();
    } catch {
      toast.error("ไม่สามารถสลับผู้ใช้ได้");
    } finally {
      setIsSwitching(false);
    }
  };

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const isDev = process.env.NODE_ENV === "development";
  const isUserA = currentUser?.email.toLowerCase().includes("usera");
  const isUserB = currentUser?.email.toLowerCase().includes("userb");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="p-5 max-w-lg mx-auto rounded-t-3xl">
          {/* Drawer Handle / Drag Indicator */}
          <div className="mx-auto -mt-2 mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

          <SheetHeader className="mb-4">
            <SheetTitle className="text-base font-bold">เมนูเพิ่มเติม</SheetTitle>
            <SheetDescription className="text-xs">
              เข้าถึงรายงานสรุป การตั้งค่าระบบ และจัดการบัญชีผู้ใช้
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {/* Real User Profile Card */}
            {currentUser ? (
              <div className="p-3.5 rounded-2xl bg-muted/50 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-11 w-11 shrink-0 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground truncate">
                        {currentUser.name}
                      </span>
                      {currentUser.isMock && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shrink-0"
                        >
                          Dev Mock
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate block">
                      {currentUser.email}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-2">ยังไม่ได้เข้าสู่ระบบ</p>
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/login");
                  }}
                  className="w-full text-xs font-semibold"
                >
                  เข้าสู่ระบบ
                </Button>
              </div>
            )}

            {/* Navigation Options */}
            <div className="space-y-1">
              <Link
                href="/reports"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3.5 p-3 rounded-xl transition-colors",
                  pathname === "/reports"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted/70"
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block leading-tight">รายงานและสถิติ</span>
                  <span className="text-xs text-muted-foreground block">
                    วิเคราะห์แนวโน้มค่าใช้จ่ายและประวัติการชำระ
                  </span>
                </div>
              </Link>

              <Link
                href="/settings"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3.5 p-3 rounded-xl transition-colors",
                  pathname === "/settings"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted/70"
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block leading-tight">การตั้งค่า</span>
                  <span className="text-xs text-muted-foreground block">
                    บัญชี การเชื่อมต่อคู่แชร์ และการแจ้งเตือน
                  </span>
                </div>
              </Link>
            </div>

            {/* Theme Switcher Quick Row */}
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground pl-1">โหมดการแสดงผล</span>
              <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border/80">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    theme === "light"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="โหมดสว่าง"
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    theme === "dark"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="โหมดมืด"
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    theme === "system"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="ตามระบบ"
                >
                  <Laptop className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Development User Switcher */}
            {isDev && currentUser && (
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>สลับบัญชีทดสอบ (Dev Switcher)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={isUserA ? "default" : "outline"}
                    size="sm"
                    disabled={isSwitching}
                    onClick={() => handleDevSwitchUser("usera@example.com", "User A")}
                    className="h-8 text-xs justify-between"
                  >
                    <span>User A</span>
                    {isUserA && <Check className="h-3 w-3" />}
                  </Button>

                  <Button
                    type="button"
                    variant={isUserB ? "default" : "outline"}
                    size="sm"
                    disabled={isSwitching}
                    onClick={() => handleDevSwitchUser("userb@example.com", "User B")}
                    className="h-8 text-xs justify-between"
                  >
                    <span>User B</span>
                    {isUserB && <Check className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Logout Button */}
            {currentUser && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmLogoutOpen(true)}
                  className="w-full h-10 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>ออกจากระบบ</span>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Safety Confirmation Dialog for Logout */}
      <Dialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>ยืนยันการออกจากระบบ</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1.5">
              คุณต้องการออกจากระบบบัญชี {currentUser?.name} ({currentUser?.email}) ใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoggingOut}
              onClick={() => setConfirmLogoutOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="gap-1.5"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>กำลังออกจากระบบ...</span>
                </>
              ) : (
                <span>ยืนยันออกจากระบบ</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
