/**
 * Utility functions for dynamic monthly rent cycles, month-end clamping,
 * and safe billing period calculations.
 */

export interface BillingCycle {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
}

/**
 * Returns the maximum days in a given year and month (1-based, 1 = Jan, 12 = Dec).
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

/**
 * Converts a Date or YYYY-MM-DD string to standard YYYY-MM-DD string.
 */
export const toISODate = (d: string | Date): string => {
  if (typeof d === 'string') {
    return d.split('T')[0];
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates the next due date for a monthly cycle starting from periodStart,
 * anchored to anchorDay (defaulting to periodStart's day).
 * Safely clamps month-ends (e.g. 31 Jan -> 28 Feb / 29 Feb leap year, 31 Mar -> 30 Apr).
 */
export const calculateNextDueDate = (periodStart: string | Date, anchorDay?: number): string => {
  const iso = toISODate(periodStart);
  const [yStr, mStr, dStr] = iso.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10); // 1-based
  const currentDay = parseInt(dStr, 10);

  const anchor = anchorDay !== undefined ? anchorDay : currentDay;

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextYear += 1;
    nextMonth = 1;
  }

  const maxDays = getDaysInMonth(nextYear, nextMonth);
  const clampedDay = Math.min(anchor, maxDays);

  const padMonth = String(nextMonth).padStart(2, '0');
  const padDay = String(clampedDay).padStart(2, '0');
  return `${nextYear}-${padMonth}-${padDay}`;
};

/**
 * Calculates the full billing period (periodStart to periodEnd) and nextDueDate.
 * periodEnd is exactly one calendar day before nextDueDate.
 *
 * Example:
 *   Check-in 2026-11-22 -> periodStart: 2026-11-22, periodEnd: 2026-12-21, nextDue: 2026-12-22
 *   Check-in 2026-11-05 -> periodStart: 2026-11-05, periodEnd: 2026-12-04, nextDue: 2026-12-05
 *   Check-in 2026-11-01 -> periodStart: 2026-11-01, periodEnd: 2026-11-30, nextDue: 2026-12-01
 *   Check-in 2026-01-31 -> periodStart: 2026-01-31, periodEnd: 2026-02-27, nextDue: 2026-02-28
 */
export const calculateBillingPeriod = (periodStart: string | Date, anchorDay?: number): BillingCycle => {
  const startIso = toISODate(periodStart);
  const nextDue = calculateNextDueDate(startIso, anchorDay);

  // Subtract 1 day from nextDue to find periodEnd
  const [ny, nm, nd] = nextDue.split('-').map((n) => parseInt(n, 10));
  const dueObj = new Date(ny, nm - 1, nd);
  dueObj.setDate(dueObj.getDate() - 1);

  const endIso = toISODate(dueObj);

  return {
    periodStart: startIso,
    periodEnd: endIso,
    nextDueDate: nextDue,
  };
};

/**
 * Determines the active billing cycle for a given date (default today)
 * based on the guest's original admission / check-in date.
 */
export const getCycleForDate = (admissionDate: string | Date, asOfDate?: string | Date): BillingCycle => {
  const admIso = toISODate(admissionDate);
  const asOfIso = asOfDate ? toISODate(asOfDate) : toISODate(new Date());

  const anchorDay = parseInt(admIso.split('-')[2], 10);
  let currentStart = admIso;

  if (asOfIso < admIso) {
    return calculateBillingPeriod(admIso, anchorDay);
  }

  for (let i = 0; i < 1200; i++) {
    const cycle = calculateBillingPeriod(currentStart, anchorDay);
    if (currentStart <= asOfIso && asOfIso <= cycle.periodEnd) {
      return cycle;
    }
    if (cycle.nextDueDate > asOfIso) {
      return cycle;
    }
    currentStart = cycle.nextDueDate;
  }

  return calculateBillingPeriod(admIso, anchorDay);
};

/**
 * Formats a YYYY-MM-DD or ISO string into clean DD-MM-YYYY format.
 */
export const formatDateDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};
