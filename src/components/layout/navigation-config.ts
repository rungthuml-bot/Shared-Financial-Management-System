import {
  LayoutDashboard,
  CreditCard,
  CalendarDays,
  Users2,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "แดชบอร์ด",
    href: "/",
    icon: LayoutDashboard,
    description: "ภาพรวมรายการผ่อนและยอดชำระ",
  },
  {
    title: "รายการผ่อน",
    href: "/installments",
    icon: CreditCard,
    badge: "5",
    description: "จัดการรายการผ่อนทั้งหมด",
  },
  {
    title: "ปฏิทิน",
    href: "/calendar",
    icon: CalendarDays,
    description: "กำหนดชำระรายเดือน",
  },
  {
    title: "ผ่อนร่วม",
    href: "/shared",
    icon: Users2,
    badge: "เคลียร์ยอด",
    description: "รายการแชร์และยอดเคลียร์ 2 คน",
  },
  {
    title: "รายงาน",
    href: "/reports",
    icon: BarChart3,
    description: "สถิติและแนวโน้มค่าใช้จ่าย",
  },
  {
    title: "ตั้งค่า",
    href: "/settings",
    icon: Settings,
    description: "บัญชีและการแจ้งเตือน",
  },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  {
    title: "หน้าแรก",
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
  {
    title: "เพิ่มเติม",
    href: "/settings",
    icon: Settings,
  },
];
