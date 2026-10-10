"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import type { NotificationType, Prisma } from "@prisma/client";
import type { ActionResult } from "./installment.actions";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  destinationHref: string;
  isRead: boolean;
}

export interface NotificationPageData {
  notifications: NotificationItem[];
  unreadCount: number;
}

/**
 * Safely compute destination navigation URL based on notification type and content.
 */
function getNotificationDestination(type: NotificationType, title?: string): string {
  switch (type) {
    case "SETTLEMENT":
      return "/shared";
    case "PAYMENT_DUE":
    case "PAYMENT_OVERDUE":
      return "/installments";
    case "SYSTEM":
      if (title?.includes("ผ่อนร่วม") || title?.includes("เคลียร์ยอด")) {
        return "/shared";
      }
      return "/installments";
    default:
      return "/";
  }
}

/**
 * Server Action: Retrieve the authenticated user's notifications.
 * Strictly scoped to session user ID, newest first, bounded query limit.
 */
export async function getNotificationsAction(
  limit = 20
): Promise<ActionResult<NotificationPageData>> {
  try {
    const user = await requireAuthUser();

    const boundedLimit = Math.min(Math.max(limit, 1), 50);

    const [dbNotifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: boundedLimit,
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          readAt: null,
        },
      }),
    ]);

    const notifications: NotificationItem[] = dbNotifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
      destinationHref: getNotificationDestination(n.type, n.title),
      isRead: n.readAt !== null,
    }));

    return {
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดรายการแจ้งเตือน";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Return real unread notification count for the authenticated user.
 */
export async function getUnreadNotificationCountAction(): Promise<
  ActionResult<{ unreadCount: number }>
> {
  try {
    const user = await requireAuthUser();

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        readAt: null,
      },
    });

    return {
      success: true,
      data: { unreadCount },
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตรวจสอบจำนวนแจ้งเตือน";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Mark a single notification as read.
 * Validates ownership strictly against authenticated user ID.
 */
export async function markNotificationAsReadAction(
  notificationId: string
): Promise<ActionResult<{ id: string; readAt: string }>> {
  try {
    const user = await requireAuthUser();

    if (!notificationId || typeof notificationId !== "string" || !notificationId.trim()) {
      return { success: false, error: "รหัสการแจ้งเตือนไม่ถูกต้อง" };
    }

    const notif = await prisma.notification.findUnique({
      where: { id: notificationId.trim() },
    });

    if (!notif) {
      return { success: false, error: "ไม่พบข้อมูลการแจ้งเตือนดังกล่าว" };
    }

    if (notif.userId !== user.id) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการจัดการการแจ้งเตือนนี้ (Unauthorized)",
      };
    }

    const now = new Date();
    const updated = await prisma.notification.update({
      where: { id: notif.id },
      data: {
        readAt: notif.readAt ?? now,
      },
    });

    try {
      revalidatePath("/", "layout");
    } catch {
      // Allowed in isolated test execution contexts
    }

    return {
      success: true,
      data: {
        id: updated.id,
        readAt: (updated.readAt ?? now).toISOString(),
      },
      message: "ทำเครื่องหมายว่าอ่านแล้วเรียบร้อย",
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตสถานะการแจ้งเตือน";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Mark all unread notifications of authenticated user as read.
 */
export async function markAllNotificationsAsReadAction(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const user = await requireAuthUser();

    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    try {
      revalidatePath("/", "layout");
    } catch {
      // Allowed in isolated test execution contexts
    }

    return {
      success: true,
      data: { count: result.count },
      message: `ทำเครื่องหมายว่าอ่านแล้วทั้งหมด (${result.count} รายการ)`,
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตการแจ้งเตือนทั้งหมด";
    return { success: false, error: msg };
  }
}

/**
 * Internal Server Helper: Create a real notification safely.
 * Can be passed an existing Prisma transaction client.
 */
export async function createNotificationInternal(
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
  },
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  await client.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
    },
  });
}
