"use server";

import { requireAuthUser } from "@/lib/session";
import {
  ReportService,
  type ReportFilterInput,
  type ReportData,
} from "@/services/report.service";
import type { ActionResult } from "./installment.actions";

/**
 * Server Action: Fetch user-authorized financial reports and detailed breakdowns
 */
export async function getReportDataAction(
  filters: ReportFilterInput
): Promise<ActionResult<ReportData>> {
  try {
    const user = await requireAuthUser();
    const data = await ReportService.getReportData(user.id, filters);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(data)),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดรายงาน";
    return {
      success: false,
      error: msg,
    };
  }
}
