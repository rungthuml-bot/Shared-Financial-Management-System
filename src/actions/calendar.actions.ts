"use server";

import { requireAuthUser } from "@/lib/session";
import {
  CalendarService,
  type CalendarFilterInput,
  type CalendarData,
} from "@/services/calendar.service";
import type { ActionResult } from "./installment.actions";

/**
 * Server Action: Fetch user calendar data with events and filtering
 */
export async function getCalendarDataAction(
  filters: CalendarFilterInput
): Promise<ActionResult<CalendarData>> {
  try {
    const user = await requireAuthUser();
    const data = await CalendarService.getCalendarData(user.id, filters);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(data)),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทิน";
    return {
      success: false,
      error: msg,
    };
  }
}
