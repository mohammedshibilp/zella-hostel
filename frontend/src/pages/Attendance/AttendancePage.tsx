import React, { useEffect, useState } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { guestService } from '../../services/guestService';
import { Guest, AttendanceSummary } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { useToast } from '../../context/ToastContext';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  DoorOpen,
} from 'lucide-react';

interface AttendanceRow {
  guest_id: number;
  guest_name: string;
  room_number?: string;
  bed_number?: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Out';
  remarks: string;
}

export const AttendancePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { success, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [activeGuests, existingRecords, sumData] = await Promise.all([
        guestService.getGuests({ status_filter: 'Active' }),
        attendanceService.getAttendance(selectedDate),
        attendanceService.getSummary(selectedDate),
      ]);

      const recordsMap = new Map(existingRecords.map((r) => [r.guest_id, r]));

      const combinedRows: AttendanceRow[] = activeGuests.map((g) => {
        const existing = recordsMap.get(g.id);
        return {
          guest_id: g.id,
          guest_name: g.name,
          room_number: g.room_number,
          bed_number: g.bed_number,
          status: existing ? (existing.status as any) : 'Present',
          remarks: existing?.remarks || '',
        };
      });

      setRows(combinedRows);
      setSummary(sumData);
    } catch (err) {
      toastError('Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleStatusChange = (guestId: number, status: 'Present' | 'Absent' | 'Leave' | 'Out') => {
    setRows((prev) =>
      prev.map((r) => (r.guest_id === guestId ? { ...r, status } : r))
    );
  };

  const handleRemarksChange = (guestId: number, remarks: string) => {
    setRows((prev) =>
      prev.map((r) => (r.guest_id === guestId ? { ...r, remarks } : r))
    );
  };

  const handleMarkAll = (status: 'Present' | 'Absent' | 'Leave' | 'Out') => {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const recordsToSave = rows.map((r) => ({
        guest_id: r.guest_id,
        status: r.status,
        remarks: r.remarks || undefined,
      }));
      await attendanceService.saveBulk(selectedDate, recordsToSave);
      success(`Attendance for ${selectedDate} saved successfully!`, 'Saved');
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to save attendance', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRows = rows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.guest_name.toLowerCase().includes(q) ||
      (r.room_number && r.room_number.toLowerCase().includes(q)) ||
      (r.bed_number && r.bed_number.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Daily Resident Attendance"
        subtitle="Record daily presence, leaves, and out-movements for all active hostel residents"
        actions={
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Attendance
          </Button>
        }
      />

      {/* SUMMARY STATS & DATE BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Date Selector */}
        <Card padding="sm" className="flex items-center gap-3 col-span-2 md:col-span-1">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <div className="w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Attendance Date
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-navy-900 bg-transparent focus:outline-none w-full"
            />
          </div>
        </Card>

        {/* Present Count */}
        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Present
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              {rows.filter((r) => r.status === 'Present').length}
            </span>
          </div>
        </Card>

        {/* Absent Count */}
        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Absent
            </span>
            <span className="text-xl font-extrabold text-rose-600">
              {rows.filter((r) => r.status === 'Absent').length}
            </span>
          </div>
        </Card>

        {/* Leave Count */}
        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              On Leave
            </span>
            <span className="text-xl font-extrabold text-amber-600">
              {rows.filter((r) => r.status === 'Leave').length}
            </span>
          </div>
        </Card>

        {/* Out Count */}
        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Out
            </span>
            <span className="text-xl font-extrabold text-indigo-600">
              {rows.filter((r) => r.status === 'Out').length}
            </span>
          </div>
        </Card>
      </div>

      {/* QUICK ACTIONS & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions:</span>
          <button
            type="button"
            onClick={() => handleMarkAll('Present')}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll('Absent')}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            Mark All Absent
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search resident or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-navy-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary w-48 sm:w-60"
          />
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {filteredRows.length} residents
          </span>
        </div>
      </div>

      {/* ATTENDANCE TABLE */}
      {isLoading ? (
        <LoadingState message="Loading resident roster..." />
      ) : filteredRows.length === 0 ? (
        <Card className="text-center py-12 text-slate-400 text-xs">
          {rows.length === 0
            ? 'No active residents currently admitted in the hostel.'
            : 'No residents matching your search query.'}
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Resident</th>
                  <th className="px-5 py-3.5">Room & Bed</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.guest_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-navy-900">{row.guest_name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <DoorOpen className="w-3.5 h-3.5 text-secondary" />
                        <span>
                          Room {row.room_number || '—'} • Bed {row.bed_number || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {(['Present', 'Absent', 'Leave', 'Out'] as const).map((st) => {
                          const isSelected = row.status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(row.guest_id, st)}
                              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                                isSelected
                                  ? st === 'Present'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : st === 'Absent'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : st === 'Leave'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                    : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        value={row.remarks}
                        onChange={(e) => handleRemarksChange(row.guest_id, e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
