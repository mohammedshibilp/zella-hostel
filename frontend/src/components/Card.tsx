import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  padding = 'md',
  ...props
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`bg-white rounded-[20px] border border-slate-200/80 shadow-card transition-all duration-200 ${
        interactive ? 'hover:shadow-cardHover hover:border-slate-300 cursor-pointer' : ''
      } ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
