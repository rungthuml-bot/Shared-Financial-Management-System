"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  CalendarDays,
  Users2,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileMoreSheet } from "./mobile-more-sheet";

const MAIN_NAV_ITEMS = [
  {
    title: "หน้าหลัก",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "รายการผ่อน",
    href: "/installments",
    icon: CreditCard,
  },
  {
    title: "ปฏิทิน",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "ผ่อนร่วม",
    href: "/shared",
    icon: Users2,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Check if current route is part of "More" sheet items (e.g. /reports or /settings)
  const isMoreActive =
    pathname.startsWith("/reports") || pathname.startsWith("/settings");

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/80 bg-card/95 backdrop-blur-lg pb-safe shadow-lg">
        <div className="flex h-16 items-center justify-around px-1">
          {MAIN_NAV_ITEMS.map((item) => {
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
                  "flex flex-1 flex-col items-center justify-center py-1 transition-all relative group select-none",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute -top-[1px] h-0.5 w-7 rounded-full bg-primary" />
                )}
                <div
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isActive ? "scale-110 text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <span className="text-[10.5px] leading-tight mt-0.5 tracking-tight truncate max-w-[68px] text-center">
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* 5th Item: "เพิ่มเติม" (Opens Mobile More Sheet) */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-1 transition-all relative group select-none cursor-pointer focus:outline-none",
              isMoreActive || moreOpen
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="เปิดเมนูเพิ่มเติม"
          >
            {(isMoreActive || moreOpen) && (
              <span className="absolute -top-[1px] h-0.5 w-7 rounded-full bg-primary" />
            )}
            <div
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                (isMoreActive || moreOpen) && "bg-primary/10"
              )}
            >
              <Menu
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isMoreActive || moreOpen
                    ? "scale-110 text-primary"
                    : "text-muted-foreground"
                )}
              />
            </div>
            <span className="text-[10.5px] leading-tight mt-0.5 tracking-tight truncate max-w-[68px] text-center">
              เพิ่มเติม
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile More Drawer / Sheet */}
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
