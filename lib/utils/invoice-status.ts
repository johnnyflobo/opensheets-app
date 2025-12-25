import { getTodayLocal, parseLocalDateString } from "@/lib/utils/date";

export type InvoiceStatus = "Aberta" | "Fechada" | "Atrasada" | "Futura";

export type InvoiceStatusResult = {
  status: InvoiceStatus;
  label: string;
};

/**
 * Determines the status of a specific period's invoice for a credit card
 *
 * Logic:
 * - Atrasada: Past period AND Today > Due Date (of that period)
 * - Fechada: Past period AND (Today <= Due Date OR just passed closing) - but user wants "Atrasada" if late.
 * - Aberta: The period covering Today.
 * - Futura: Future periods.
 *
 * User Specifics:
 * - "Zerada": User requested this, but it implies paid/empty. without data, we might use "Fechada" or check if it's very old.
 *   For now, we will map:
 *   - Current Open Cycle -> "Aberta"
 *   - Past Cycle & Today > Due Date -> "Atrasada"
 *   - Past Cycle & Today <= Due Date -> "Fechada" (or "Aguardando Pagamento")
 *   - Future Cycle -> "Parcial" (User asked for "Parcial" meaning "tem contas a pagar", implies future installments)
 */
export function getInvoiceStatus(
  period: string,
  closingDay: number,
  dueDay: number
): InvoiceStatusResult {
  const today = getTodayLocal();
  const [year, month] = period.split("-").map(Number);
  
  // Calculate the closing date for this period
  // Usually, if a period is "2025-12" (December Invoice), it depends on the closing day.
  // If closing day is 10, Dec Invoice closes around Dec 10? Or Jan 10?
  // Convention: Period usually refers to the Due Month.
  // Let's assume Period = Due Month.
  
  const dueDate = new Date(year, month - 1, dueDay);
  
  // Closing date is usually ~10 days before due date in the same or previous month.
  // But strictly, "Period" in this app seems to be the Due Month.
  
  // Check if period is in the past
  // status: "Atrasada" if today > dueDate
  
  // If period matches the "active" invoice
  // The active invoice is the one where Today is between (Previous Closing) and (Current Closing).
  // Actually, simpler:
  // "Aberta" = The invoice currently receiving new transactions.
  // "Parcial" = Future invoices receiving installments.
  
  // Let's determine the "Open" period first.
  // If Today <= Closing Day, Current Month is Open.
  // If Today > Closing Day, Next Month is Open.
  
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  
  let openPeriodYear = currentYear;
  let openPeriodMonth = currentMonth;
  
  // 1. Determine the closing month of the current active cycle
  // If today > closingDay, we are already in the next cycle's accumulation phase
  if (currentDay > closingDay) {
    openPeriodMonth++;
    if (openPeriodMonth > 12) {
      openPeriodMonth = 1;
      openPeriodYear++;
    }
  }
  
  // 2. Determine the reference due month for this cycle
  // If dueDay < closingDay, it implies the due date is in the NEXT month relative to the closing date.
  // Example: Closes Jan 23, Due Feb 5. Reference Month is Feb.
  if (dueDay < closingDay) {
    openPeriodMonth++;
    if (openPeriodMonth > 12) {
      openPeriodMonth = 1;
      openPeriodYear++;
    }
  }

  const openPeriod = `${openPeriodYear}-${String(openPeriodMonth).padStart(2, '0')}`;
  
  // Compare input period with open period
  if (period === openPeriod) {
    return { status: "Aberta", label: "(Aberta)" };
  }
  
  if (period > openPeriod) {
    return { status: "Futura", label: "(Parcial)" };
  }
  
  // Past period
  if (today > dueDate) {
    return { status: "Atrasada", label: "(Atrasada)" };
  }
  
  // Past period but before due date (e.g. Closed yesterday, due in 10 days)
  return { status: "Fechada", label: "(Fechada)" };
}
