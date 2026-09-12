import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';
import { DashboardMetrics } from '../../types';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { LoadingState } from '../../components/LoadingState';
import {
  Users,
  DoorOpen,
  CalendarCheck,
  ArrowRight,
  UserPlus,
  Receipt,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

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
    return <LoadingState message="Loading hostel dashboard..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto w-full">
      <PageHeader
        title="Hostel Dashboard"
        subtitle="Live resident occupancy, bed vacancies, and advance bookings"
      />

      {/* THE 3 CORE METRICS REQUESTED BY CLIENT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. TOTAL GUESTS */}
        <Card
          padding="lg"
          className="relative overflow-hidden border border-slate-200/80 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 pointer-events-none group-hover:scale-110 transition-transform" />
          
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black tracking-wider text-slate-400 uppercase block mb-2">
                TOTAL GUESTS
              </span>
              <div className="text-4xl sm:text-5xl font-black text-navy-900 tracking-tight">
                {metrics?.total_guests || 0}
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <Users className="w-7 h-7" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active in Hostel
            </span>
            <Link
              to="/guests"
              className="text-xs font-bold text-primary hover:text-primary-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            >
              <span>View Guests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* 2. VACANCIES */}
        <Card
          padding="lg"
          className="relative overflow-hidden border border-slate-200/80 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -mr-10 -mt-10 pointer-events-none group-hover:scale-110 transition-transform" />

          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black tracking-wider text-slate-400 uppercase block mb-2">
                VACANCIES
              </span>
              <div className="text-4xl sm:text-5xl font-black text-secondary tracking-tight">
                {metrics?.vacancies ?? 49}
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-md shadow-secondary/20 shrink-0">
              <DoorOpen className="w-7 h-7" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {metrics?.occupied_beds || 0} occupied of {metrics?.total_beds || 49} beds
            </span>
            <Link
              to="/rooms"
              className="text-xs font-bold text-secondary hover:text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            >
              <span>23-Room Chart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* 3. BOOKING */}
        <Card
          padding="lg"
          className="relative overflow-hidden border border-slate-200/80 hover:shadow-lg transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-10 -mt-10 pointer-events-none group-hover:scale-110 transition-transform" />

          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black tracking-wider text-slate-400 uppercase block mb-2">
                BOOKING
              </span>
              <div className="text-4xl sm:text-5xl font-black text-indigo-700 tracking-tight">
                {metrics?.active_bookings || 0}
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <CalendarCheck className="w-7 h-7" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-600">
              Confirmed upcoming arrivals
            </span>
            <Link
              to="/bookings"
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            >
              <span>Manage Bookings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* QUICK OPERATIONAL HUB */}
      <div className="mt-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-secondary" />
          <span>Quick Actions</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/admissions"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-navy-900 group-hover:text-primary transition-colors">
              New Admission
            </span>
          </Link>

          <Link
            to="/rooms"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-secondary hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary-50 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors flex items-center justify-center">
              <DoorOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-navy-900 group-hover:text-secondary transition-colors">
              23-Room Chart
            </span>
          </Link>

          <Link
            to="/fee-receipts"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-navy-900 group-hover:text-emerald-700 transition-colors">
              Fee Receipts
            </span>
          </Link>

          <Link
            to="/attendance"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-navy-900 group-hover:text-primary transition-colors">
              Daily Attendance
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};
