import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { DashboardMetrics } from '../../types';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  DoorOpen,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  UserCheck,
  HelpCircle,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await dashboardService.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading dashboard intelligence..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Hostel Overview"
        subtitle="Real-time occupancy, guest registrations, and operational metrics"
      />

      {/* TOP METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* TOTAL GUESTS */}
        <Card padding="md" className="flex items-center justify-between border-slate-200">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              TOTAL GUESTS
            </span>
            <span className="text-3xl font-extrabold text-navy-900 tracking-tight">
              {metrics?.total_guests || 0}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active in Hostel
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-primary-50 text-primary flex items-center justify-center p-3 shrink-0">
            <Users className="w-7 h-7" />
          </div>
        </Card>

        {/* VACANCIES */}
        <Card padding="md" className="flex items-center justify-between border-slate-200">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              VACANCIES
            </span>
            <span className="text-3xl font-extrabold text-secondary tracking-tight">
              {metrics?.vacancies || 0}
            </span>
            <span className="text-[11px] font-medium text-slate-500 mt-1">
              out of {metrics?.total_beds || 0} total beds
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-secondary-50 text-secondary flex items-center justify-center p-3 shrink-0">
            <DoorOpen className="w-7 h-7" />
          </div>
        </Card>

        {/* ACTIVE BOOKINGS */}
        <Card padding="md" className="flex items-center justify-between border-slate-200">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              ACTIVE BOOKINGS
            </span>
            <span className="text-3xl font-extrabold text-navy-900 tracking-tight">
              {metrics?.active_bookings || 0}
            </span>
            <span className="text-[11px] font-medium text-primary mt-1 flex items-center gap-0.5">
              <span>Awaiting check-in</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center p-3 shrink-0">
            <CalendarCheck className="w-7 h-7" />
          </div>
        </Card>

        {/* OCCUPANCY RATE */}
        <Card padding="md" className="flex items-center justify-between border-slate-200">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              OCCUPANCY RATE
            </span>
            <span className="text-3xl font-extrabold text-navy-900 tracking-tight">
              {metrics?.occupancy_rate || 0}%
            </span>
            <div className="w-32 bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics?.occupancy_rate || 0)}%` }}
              />
            </div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center p-3 shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
        </Card>
      </div>

      {/* SECONDARY ROW: FLOOR OCCUPANCY & TODAY ATTENDANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* FLOOR OCCUPANCY (23 Rooms across 3 floors) */}
        <Card padding="md" className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base text-navy-900">Floor-wise Bed Occupancy</h3>
            </div>
            <Link
              to="/rooms"
              className="text-xs font-semibold text-primary hover:text-primary-700 flex items-center gap-1"
            >
              <span>View 23-Room Chart</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {metrics?.floor_stats?.map((fl) => (
              <div
                key={fl.floor}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">Floor {fl.floor}</span>
                  <span className="text-xs font-bold text-primary">{fl.occupancy_percentage}%</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-navy-900">{fl.occupied_beds}</span>
                  <span className="text-xs text-slate-400 font-medium">/ {fl.total_beds} beds</span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden mt-1">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, fl.occupancy_percentage)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 font-medium">{fl.vacant_beds} beds available</span>
              </div>
            ))}
          </div>
        </Card>

        {/* TODAY ATTENDANCE & FINANCIAL SUMMARY */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-navy-900">Today Attendance</h3>
              </div>
              <Link to="/attendance" className="text-xs font-semibold text-primary">
                Mark
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-emerald-800 font-medium">Present Today</span>
                <div className="text-2xl font-black text-emerald-900">{metrics?.today_present || 0}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium">Total Guests</span>
                <div className="text-sm font-bold text-slate-700">{metrics?.total_guests || 0}</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              This Month Income
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-primary">
                ₹{(metrics?.total_income_this_month || 0).toLocaleString()}
              </span>
              <Link to="/accounts" className="text-xs font-semibold text-secondary hover:underline">
                View Ledger
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* RECENT ACTIVITY TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* RECENT ADMISSIONS */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-navy-900">Recent Admissions</h3>
            <Link to="/admissions" className="text-xs font-semibold text-primary">
              View all
            </Link>
          </div>
          {metrics?.recent_admissions && metrics.recent_admissions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {metrics.recent_admissions.map((adm: any) => (
                <div key={adm.id} className="py-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-navy-900">{adm.guest_name}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Room {adm.room_number} • Bed {adm.bed_number}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary">₹{adm.monthly_fee}/mo</span>
                    <span className="block text-[11px] text-slate-400">{adm.admission_date}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No recent admissions recorded.</p>
          )}
        </Card>

        {/* RECENT ENQUIRIES */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-navy-900">Recent Enquiries</h3>
            <Link to="/enquiries" className="text-xs font-semibold text-primary">
              View all
            </Link>
          </div>
          {metrics?.recent_enquiries && metrics.recent_enquiries.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {metrics.recent_enquiries.map((enq: any) => (
                <div key={enq.id} className="py-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-navy-900">{enq.name}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {enq.contact_no} • Mode: {enq.mode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={enq.current_status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No recent enquiries found.</p>
          )}
        </Card>
      </div>
    </div>
  );
};
