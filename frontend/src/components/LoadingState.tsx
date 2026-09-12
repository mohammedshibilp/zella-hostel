import React from 'react';
import { Card } from './Card';
import { FolderOpen } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium text-slate-500">{message}</span>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 mb-3">
        {icon || <FolderOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-bold text-navy-900">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">{description}</p>}
      {action && <div>{action}</div>}
    </Card>
  );
};
