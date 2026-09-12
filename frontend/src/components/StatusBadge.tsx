import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getVariant = (st: string) => {
    const s = st.toLowerCase();
    if (['available', 'active', 'confirmed', 'present', 'resolved'].includes(s)) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (['occupied', 'full', 'absent'].includes(s)) {
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    }
    if (['pending', 'in progress', 'leave', 'open', 'maintenance'].includes(s)) {
      return 'bg-amber-50 text-amber-700 border-amber-200/80';
    }
    if (['checkedin', 'converted'].includes(s)) {
      return 'bg-primary-50 text-primary-800 border-primary-200/80';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide uppercase ${getVariant(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status}
    </span>
  );
};
