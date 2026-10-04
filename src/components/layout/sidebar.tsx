"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navigation-config";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ReceiptText, ArrowLeftRight } from "lucide-react";
import { UserProfileMenu } from "./user-profile-menu";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl md:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border/60">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base tracking-tight text-foreground leading-tight">
              Installment
            </span>
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              Manager
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Two-User Sync Card */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-muted/50 border border-border/60">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="font-medium">ผู้ใช้ร่วมในระบบ</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">2 คน</Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                UA
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium truncate text-foreground">User A</span>
          </div>
          <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 border border-violet-500/20">
              <AvatarFallback className="bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[11px] font-semibold">
                UB
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium truncate text-foreground">User B</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.title}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Dynamic User Profile Menu */}
      <UserProfileMenu />
    </aside>
  );
}
