"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Header } from "./header";
import { getCurrentUserAction } from "@/actions/auth.actions";
import { Loader2 } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    if (isAuthRoute) return;

    let mounted = true;
    getCurrentUserAction()
      .then((res) => {
        if (!mounted) return;
        if (!res.success || !res.user) {
          router.replace("/login");
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (mounted) {
          router.replace("/login");
        }
      });

    return () => {
      mounted = false;
    };
  }, [pathname, isAuthRoute, router]);

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col md:pl-64">
        {/* Top Header */}
        <Header />

        {/* Page Content with bottom padding for mobile navigation */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
