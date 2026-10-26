import React from 'react';
import { PaymentStatus, ScheduleStatus } from '../../types';

interface StatusBadgeProps {
  status: PaymentStatus | ScheduleStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let styleClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  switch (status) {
    case 'Paid':
    case 'Completed':
      styleClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80';
      break;
    case 'Partially Paid':
      styleClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80';
      break;
    case 'Unpaid':
      styleClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80';
      break;
    case 'Due Today':
      styleClasses = 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800 animate-pulse';
      break;
    case 'Overdue':
      styleClasses = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800 font-semibold';
      break;
    case 'Upcoming':
      styleClasses = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/80';
      break;
    default:
      break;
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold'
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${sizeClasses} ${styleClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};
