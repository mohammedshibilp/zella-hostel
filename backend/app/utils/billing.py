import calendar
from datetime import date, timedelta
from typing import Tuple, Optional


def calculate_next_due_date(period_start: date, anchor_day: Optional[int] = None) -> date:
    """
    Calculates the next month's due date following the anchor day (e.g. check-in day).
    If the next month has fewer days than anchor_day, clamps safely to the month's last valid day.

    Examples:
      - 2026-11-22, anchor 22 -> 2026-12-22
      - 2026-11-05, anchor 5  -> 2026-12-05
      - 2026-11-01, anchor 1  -> 2026-12-01
      - 2026-01-31, anchor 31 -> 2026-02-28 (or 2028-02-29 in leap year)
      - 2026-01-30, anchor 30 -> 2026-02-28
      - 2026-03-31, anchor 31 -> 2026-04-30
    """
    if anchor_day is None:
        anchor_day = period_start.day

    # Determine next month and year
    if period_start.month == 12:
        next_year = period_start.year + 1
        next_month = 1
    else:
        next_year = period_start.year
        next_month = period_start.month + 1

    # Clamp anchor day to maximum valid days in the target month
    _, max_days = calendar.monthrange(next_year, next_month)
    clamped_day = min(anchor_day, max_days)

    return date(next_year, next_month, clamped_day)


def calculate_billing_period(period_start: date, anchor_day: Optional[int] = None) -> Tuple[date, date, date]:
    """
    Calculates (period_start, period_end, next_due_date).
    The period_end is exactly one day prior to next_due_date.

    Examples:
      - Check-in 22 Nov 2026 -> 22-11-2026 to 21-12-2026, Next Due: 22-12-2026
      - Check-in 05 Nov 2026 -> 05-11-2026 to 04-12-2026, Next Due: 05-12-2026
      - Check-in 01 Nov 2026 -> 01-11-2026 to 30-11-2026, Next Due: 01-12-2026
      - Check-in 31 Jan 2026 -> 31-01-2026 to 27-02-2026, Next Due: 28-02-2026
    """
    next_due = calculate_next_due_date(period_start, anchor_day)
    period_end = next_due - timedelta(days=1)
    return period_start, period_end, next_due


def calculate_cycle_for_date(admission_date: date, as_of_date: Optional[date] = None) -> Tuple[date, date, date]:
    """
    Determines the active billing cycle (period_start, period_end, next_due_date)
    for a given date (defaulting to today), starting from the guest's admission/check-in date.
    Maintains the original check-in anchor day across subsequent months.
    """
    if as_of_date is None:
        as_of_date = date.today()

    anchor_day = admission_date.day
    current_start = admission_date

    # If the requested date precedes admission, return the initial cycle
    if as_of_date < admission_date:
        return calculate_billing_period(admission_date, anchor_day)

    # Step through cycles up to as_of_date
    # Limit max cycles to 1200 (100 years) to prevent infinite loops on aberrant dates
    for _ in range(1200):
        p_start, p_end, next_due = calculate_billing_period(current_start, anchor_day)
        if current_start <= as_of_date <= p_end:
            return p_start, p_end, next_due
        if next_due > as_of_date:
            return p_start, p_end, next_due
        current_start = next_due

    return calculate_billing_period(admission_date, anchor_day)
