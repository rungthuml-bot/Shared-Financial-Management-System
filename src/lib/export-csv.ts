import type { ReportTableRow } from "@/services/report.service";

/**
 * Escape CSV field to handle quotes, commas, and newlines safely.
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generate UTF-8 CSV content with BOM for Excel compatibility.
 */
export function generateReportCSV(rows: ReportTableRow[]): string {
  const headers = [
    "วันที่ครบกำหนด",
    "ชื่อรายการผ่อน",
    "ผู้ให้บริการ",
    "หมวดหมู่",
    "งวดที่",
    "ยอดเต็ม (บาท)",
    "ส่วนของฉัน (บาท)",
    "สถานะ",
    "วันที่ชำระ",
    "ประเภทการผ่อน",
  ];

  const lines = [headers.map((h) => escapeCSV(h)).join(",")];

  for (const r of rows) {
    const statusLabel =
      r.status === "PAID"
        ? "ชำระแล้ว"
        : r.status === "OVERDUE"
        ? "เกินกำหนด"
        : r.status === "DUE"
        ? "ครบกำหนดวันนี้"
        : "รอชำระ";

    lines.push(
      [
        escapeCSV(r.dueDateFormatted),
        escapeCSV(r.installmentName),
        escapeCSV(r.provider.name),
        escapeCSV(r.category?.name || "ทั่วไป"),
        escapeCSV(`${r.installmentNumber}/${r.totalInstallments}`),
        escapeCSV(r.amount.toFixed(2)),
        escapeCSV(r.myShare.toFixed(2)),
        escapeCSV(statusLabel),
        escapeCSV(r.paidAtFormatted || "-"),
        escapeCSV(r.splitDisplay),
      ].join(",")
    );
  }

  // Prepend UTF-8 Byte Order Mark (BOM) for Excel Thai encoding support
  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Trigger client-side file download for generated CSV.
 */
export function downloadReportCSV(rows: ReportTableRow[], filename: string = "installment-report.csv"): void {
  if (typeof window === "undefined") return;

  const csvContent = generateReportCSV(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
