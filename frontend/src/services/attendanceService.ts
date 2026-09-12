import api from './api';
import { Attendance, AttendanceSummary } from '../types';

export const attendanceService = {
  async getAttendance(attendanceDate?: string, guestId?: number): Promise<Attendance[]> {
    const params: any = {};
    if (attendanceDate) params.attendance_date = attendanceDate;
    if (guestId) params.guest_id = guestId;
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  async getSummary(attendanceDate: string): Promise<AttendanceSummary> {
    const response = await api.get('/attendance/summary', {
      params: { attendance_date: attendanceDate },
    });
    return response.data;
  },

  async saveBulk(attendanceDate: string, records: { guest_id: number; status: string; remarks?: string }[]): Promise<Attendance[]> {
    const response = await api.post('/attendance/bulk', {
      date: attendanceDate,
      records,
    });
    return response.data;
  },
};
