import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
};
