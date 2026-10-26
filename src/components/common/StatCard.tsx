import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  colorScheme?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue' | 'purple' | 'slate';
  badgeText?: string;
  badgeType?: 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  colorScheme = 'emerald',
  badgeText,
  badgeType = 'info',
  onClick
}) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-100 dark:border-amber-800/50',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-100 dark:border-rose-800/50',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-100 dark:border-blue-800/50',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-100 dark:border-purple-800/50',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };

  const badgeColorMap = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
  };

  return (
    <div 
      onClick={onClick}
      className={`relative p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-emerald-500/50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${colorMap[colorScheme]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
        {(subtext || badgeText) && (
          <div className="mt-2 flex items-center justify-between text-xs">
            {subtext && <span className="text-slate-500 dark:text-slate-400">{subtext}</span>}
            {badgeText && (
              <span className={`px-2 py-0.5 rounded-full font-medium ${badgeColorMap[badgeType]}`}>
                {badgeText}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
