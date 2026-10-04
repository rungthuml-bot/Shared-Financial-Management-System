"use server";

import { getCurrentUser } from "@/lib/session";
import { cookies } from "next/headers";

export interface GetCurrentUserResult {
  success: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: string;
    isMock?: boolean;
  } | null;
}

/**
 * Server Action to fetch current authenticated user safely.
 */
export async function getCurrentUserAction(): Promise<GetCurrentUserResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, user: null };
  }
  return { success: true, user };
}

/**
 * Server Action to handle logout cleanup on server.
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.set("dev_logged_out", "1", {
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
    httpOnly: false,
    sameSite: "lax",
  });

  return { success: true };
}

/**
 * Server Action to clear dev_logged_out cookie upon explicit login.
 */
export async function clearDevLoggedOutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete("dev_logged_out");
  return { success: true };
}
