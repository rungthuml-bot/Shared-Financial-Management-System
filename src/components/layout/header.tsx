"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navigation-config";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, ReceiptText } from "lucide-react";
import Link from "next/link";
import { formatThaiMonthYear } from "@/lib/date-utils";
import { NotificationPopover } from "./notification-popover";

export function Header() {
  const pathname = usePathname();
  const currentNav =
    NAV_ITEMS.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    ) ?? NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 md:px-8 backdrop-blur-xl transition-all">
      {/* Mobile Brand / Page Title */}
      <div className="flex items-center gap-3">
        <div className="flex md:hidden items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ReceiptText className="h-4 w-4" />
          </div>
          <span className="font-semibold text-base tracking-tight text-foreground">
            Installment
          </span>
        </div>
        <div className="hidden md:flex flex-col">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {currentNav.title}
          </h1>
          <p className="text-xs text-muted-foreground">{currentNav.description}</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Month Selector Pill */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs">
          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          <span>{formatThaiMonthYear(new Date())}</span>
        </div>

        {/* Quick Add Button */}
        <Link href="/installments?new=true">
          <Button size="sm" className="hidden sm:inline-flex gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>เพิ่มรายการ</span>
          </Button>
        </Link>

        {/* Real In-App Notification Bell & Popover */}
        <NotificationPopover />

        {/* Mobile Theme Toggle */}
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
