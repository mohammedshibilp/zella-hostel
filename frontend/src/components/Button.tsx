import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const variants = {
    primary:
      'bg-primary text-white hover:bg-primary-700 shadow-sm shadow-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    secondary:
      'bg-secondary text-white hover:bg-secondary-600 shadow-sm shadow-secondary/20 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2',
    outline:
      'border border-slate-200 bg-white text-navy-900 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-primary',
    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-navy-900 focus-visible:ring-2 focus-visible:ring-primary',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus-visible:ring-2 focus-visible:ring-rose-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
