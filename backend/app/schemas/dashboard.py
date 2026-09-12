from typing import Any, List, Dict
from pydantic import BaseModel


class FloorOccupancy(BaseModel):
    floor: int
    total_beds: int
    occupied_beds: int
    vacant_beds: int
    occupancy_percentage: float


class DashboardMetrics(BaseModel):
    total_guests: int
    total_rooms: int
    total_beds: int
    vacancies: int
    occupied_beds: int
    occupancy_rate: float
    active_bookings: int
    today_attendance_marked: int
    today_present: int
    pending_enquiries: int
    total_income_this_month: float
    total_expense_this_month: float
    net_profit_this_month: float
    floor_stats: List[FloorOccupancy] = []
    recent_admissions: List[Dict[str, Any]] = []
    recent_enquiries: List[Dict[str, Any]] = []
    recent_transactions: List[Dict[str, Any]] = []
