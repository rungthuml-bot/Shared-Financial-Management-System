"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";
import type { ActionResult } from "./installment.actions";

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  isMock?: boolean;
}

export interface ConnectedPartnerData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  sharedContractsCount: number;
  activeContractsCount: number;
  completedContractsCount: number;
}

export interface SettingsPageData {
  profile: UserProfileData;
  partners: ConnectedPartnerData[];
}

/**
 * Server Action: Retrieve authenticated user's database profile and
 * real deduplicated connected partners based on shared installment contracts.
 */
export async function getSettingsPageDataAction(): Promise<ActionResult<SettingsPageData>> {
  try {
    const user = await requireAuthUser();

    // 1. Fetch user's actual database record
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      return { success: false, error: "ไม่พบข้อมูลผู้ใช้งานในระบบ" };
    }

    // 2. Fetch all shared installment contracts involving this user
    const sharedInstallments = await prisma.installment.findMany({
      where: {
        ownershipType: "SHARED",
        OR: [{ ownerId: user.id }, { partnerId: user.id }],
      },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        partner: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // 3. Deduplicate partners into unique partner cards with contract counters
    const partnerMap = new Map<string, ConnectedPartnerData>();

    for (const inst of sharedInstallments) {
      const partner = inst.ownerId === user.id ? inst.partner : inst.owner;
      if (!partner) continue;

      if (!partnerMap.has(partner.id)) {
        partnerMap.set(partner.id, {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          image: partner.image,
          sharedContractsCount: 0,
          activeContractsCount: 0,
          completedContractsCount: 0,
        });
      }

      const p = partnerMap.get(partner.id)!;
      p.sharedContractsCount++;
      if (inst.status === "ACTIVE") {
        p.activeContractsCount++;
      } else if (inst.status === "COMPLETED") {
        p.completedContractsCount++;
      }
    }

    const partners = Array.from(partnerMap.values());

    return {
      success: true,
      data: {
        profile: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image,
          role: dbUser.role,
          createdAt: dbUser.createdAt.toISOString(),
          isMock: user.isMock,
        },
        partners,
      },
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลการตั้งค่า";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Update authenticated user's display name with server-side validation.
 */
export async function updateProfileNameAction(input: {
  name: string;
}): Promise<ActionResult<UserProfileData>> {
  try {
    const user = await requireAuthUser();

    // 1. Validation
    if (!input || typeof input.name !== "string") {
      return { success: false, error: "กรุณาระบุชื่อที่แสดง" };
    }

    const trimmedName = input.name.trim();

    if (trimmedName.length === 0) {
      return { success: false, error: "ชื่อที่แสดงต้องไม่เป็นค่าว่าง" };
    }

    if (trimmedName.length < 2) {
      return { success: false, error: "ชื่อที่แสดงต้องมีความยาวอย่างน้อย 2 ตัวอักษร" };
    }

    if (trimmedName.length > 50) {
      return { success: false, error: "ชื่อที่แสดงต้องมีความยาวไม่เกิน 50 ตัวอักษร" };
    }

    // 2. Persist to PostgreSQL database for the authenticated user only
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: trimmedName },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    // 3. Safe revalidation
    try {
      revalidatePath("/settings");
      revalidatePath("/");
      revalidatePath("/shared");
    } catch {
      // Standalone test runners outside Next.js request context
    }

    return {
      success: true,
      message: "บันทึกชื่อที่แสดงเรียบร้อยแล้ว",
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        image: updated.image,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูลส่วนตัว";
    return { success: false, error: msg };
  }
}
