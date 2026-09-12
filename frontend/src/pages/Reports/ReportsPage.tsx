import React, { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { LoadingState } from '../../components/LoadingState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useToast } from '../../context/ToastContext';

const COLORS = ['#3F2576', '#F7941D', '#0D9488', '#E11D48', '#6366F1'];

export const ReportsPage: React.FC = () => {
  const [occupancyReport, setOccupancyReport] = useState<any>(null);
  const [financialReport, setFinancialReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { error: toastError } = useToast();

  useEffect(() => {
    const loadReports = async () => {
      try {
        setIsLoading(true);
        const [occ, fin] = await Promise.all([
          settingsService.getOccupancyReport(),
          settingsService.getFinancialReport(6),
        ]);
        setOccupancyReport(occ);
        setFinancialReport(fin);
      } catch (err) {
        toastError('Failed to load reports');
      } finally {
        setIsLoading(false);
      }
    };
    loadReports();
  }, []);

  if (isLoading) {
    return <LoadingState message="Generating reports and analytics..." />;
  }

  const monthlyFinancials = financialReport?.monthly_financials || [];
  const floorBreakdown = occupancyReport?.floor_breakdown || [];
  const typeBreakdown = occupancyReport?.type_breakdown || [];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Hostel Analytics & Reports"
        subtitle="Revenue trajectories, cash-flow performance, and real-time room capacity distribution"
      />

      {/* REVENUE VS EXPENSE CHART */}
      <Card padding="md">
        <div className="mb-4">
          <h3 className="text-base font-bold text-navy-900">Income vs Expenditure (Last 6 Months)</h3>
          <p className="text-xs text-slate-400">Monthly breakdown of fee receipts, credits, and debits</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyFinancials} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} tickFormatter={(val) => `₹${val}`} />
              <Tooltip
                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="income" name="Income (₹)" fill="#3F2576" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Expense (₹)" fill="#F7941D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* FLOOR & TYPE BREAKDOWNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FLOOR OCCUPANCY PERCENTAGE */}
        <Card padding="md">
          <div className="mb-4">
            <h3 className="text-base font-bold text-navy-900">Floor Occupancy Percentage</h3>
            <p className="text-xs text-slate-400">Occupancy rate across Floor 1, Floor 2, and Floor 3</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={floorBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="floor" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'Occupancy Rate']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="occupancy_pct" name="Occupancy %" fill="#7545D0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ROOM TYPE OCCUPANCY PIE */}
        <Card padding="md">
          <div className="mb-4">
            <h3 className="text-base font-bold text-navy-900">Bed Distribution by Sharing Type</h3>
            <p className="text-xs text-slate-400">Total capacity by room classification</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeBreakdown}
                  dataKey="total_beds"
                  nameKey="room_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {typeBreakdown.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} Beds`, name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
