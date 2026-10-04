import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  isMock?: boolean;
}

/**
 * Retrieve the current authenticated user context from server-side session.
 * 
 * SECURITY ARCHITECTURE:
 * 1. Server-side session verification: Extracts Better Auth session using HTTP headers & cookies.
 * 2. Never trusts client-supplied userId.
 * 3. In PRODUCTION (NODE_ENV === "production"), real Better Auth session is MANDATORY.
 *    Any unauthenticated request returns null.
 * 4. In DEVELOPMENT (NODE_ENV === "development"):
 *    - If an active Better Auth session exists, it is always returned first.
 *    - If the user explicitly logged out (indicated by dev_logged_out cookie), returns null.
 *    - Otherwise, falls back to User A for frictionless local testing and tags with isMock: true.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  let reqHeaders: Headers | null = null;
  try {
    reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (session?.user) {
      return {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as { role?: string }).role ?? "user",
        isMock: false,
      };
    }
  } catch {
    // If auth API fails, proceed to development fallback if eligible
  }

  // Development fallback: STRICTLY gated by NODE_ENV === "development".
  // This block is completely bypassed in production builds.
  if (process.env.NODE_ENV === "development") {
    // Check if user has explicitly signed out in development
    const cookieHeader = reqHeaders?.get("cookie") || "";
    if (cookieHeader.includes("dev_logged_out=1")) {
      return null;
    }

    try {
      const userA = await prisma.user.findFirst({
        where: { email: "usera@example.com" },
      });
      if (userA) {
        return {
          id: userA.id,
          name: userA.name,
          email: userA.email,
          image: userA.image,
          role: userA.role,
          isMock: true,
        };
      }
    } catch {
      // Return dev mock user if database is temporarily unreachable
      return {
        id: "usr_user_a_default",
        name: "User A",
        email: "usera@example.com",
        image: null,
        role: "user",
        isMock: true,
      };
    }
  }

  return null;
}

/**
 * Require authenticated user or throw error.
 */
export async function requireAuthUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการ (Unauthorized)");
  }
  return user;
}
