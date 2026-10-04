"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Sparkles,
  Check,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { getCurrentUserAction, logoutAction, clearDevLoggedOutAction } from "@/actions/auth.actions";

export function UserProfileMenu() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    isMock?: boolean;
  } | null>(null);
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
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
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      await logoutAction();
      toast.success("ออกจากระบบเรียบร้อย");
      setCurrentUser(null);
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
      router.refresh();
      window.location.reload();
    } catch {
      toast.error("ไม่สามารถสลับผู้ใช้ได้");
    } finally {
      setIsSwitching(false);
    }
  };

  const isDev = process.env.NODE_ENV === "development";

  if (!currentUser) {
    return (
      <div className="p-3 border-t border-border/60">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <span>เข้าสู่ระบบ</span>
        </button>
      </div>
    );
  }

  // Get user initials for avatar
  const initials = currentUser.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const isUserA = currentUser.email.toLowerCase().includes("usera");
  const isUserB = currentUser.email.toLowerCase().includes("userb");

  return (
    <div className="p-3 border-t border-border/60">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-accent/60 text-left focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Avatar className="h-9 w-9 shrink-0 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate text-foreground">
                  {currentUser.name}
                </span>
                {currentUser.isMock && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  >
                    Dev Mock
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {currentUser.email}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 p-2 space-y-1">
          <DropdownMenuLabel className="font-normal px-2 py-1.5">
            <div className="flex flex-col space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                {currentUser.name}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {currentUser.email}
              </span>
            </div>
          </DropdownMenuLabel>

          {/* Development Mock Indicator */}
          {currentUser.isMock && (
            <div className="mx-1 my-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>โหมดพัฒนา (Mock Fallback: User A) จะปิดทำงานใน Production อัตโนมัติ</span>
            </div>
          )}

          {/* Development Quick Switcher */}
          {isDev && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Dev User Switcher</span>
              </div>

              <DropdownMenuItem
                onClick={() => handleDevSwitchUser("usera@example.com", "User A")}
                disabled={isSwitching}
                className="cursor-pointer text-xs justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>User A (ผู้ใช้หลัก)</span>
                </div>
                {isUserA && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleDevSwitchUser("userb@example.com", "User B")}
                disabled={isSwitching}
                className="cursor-pointer text-xs justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-violet-500" />
                  <span>User B (คู่แชร์)</span>
                </div>
                {isUserB && <Check className="h-3.5 w-3.5 text-violet-500" />}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          {/* Logout Action */}
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            {isLoggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            ) : (
              <LogOut className="h-3.5 w-3.5 mr-2" />
            )}
            <span>ออกจากระบบ</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
