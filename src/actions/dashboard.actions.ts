"use server";

import { requireAuthUser } from "@/lib/session";
import { DashboardService, type TimeframeFilter, type DashboardData } from "@/services/dashboard.service";
import type { ActionResult } from "./installment.actions";

/**
 * Server Action: Fetch real aggregated dashboard analytics data for authenticated user.
 */
export async function getDashboardDataAction(
  timeframe: TimeframeFilter = "this_month"
): Promise<ActionResult<DashboardData>> {
  try {
    const user = await requireAuthUser();
    const data = await DashboardService.getDashboardData(user.id, timeframe);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(data)),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด";
    return {
      success: false,
      error: msg,
    };
  }
}
