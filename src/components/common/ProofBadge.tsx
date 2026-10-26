import React from 'react';
import { ProofStatus } from '../../types';
import { CheckCircle2, AlertTriangle, MinusCircle, Image as ImageIcon } from 'lucide-react';

interface ProofBadgeProps {
  status?: ProofStatus;
  proofUrl?: string;
  onClick?: () => void;
  onViewProof?: () => void;
  className?: string;
}

export const ProofBadge: React.FC<ProofBadgeProps> = ({
  status,
  proofUrl,
  onClick,
  onViewProof,
  className = ''
}) => {
  const handleClick = onClick || onViewProof;
  // Infer status if not explicitly given
  const resolvedStatus: ProofStatus = status || (proofUrl ? 'Proof Attached' : 'Not Required');

  if (resolvedStatus === 'Proof Attached') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!handleClick}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:opacity-90 transition-opacity ${handleClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
        title="Proof Attached — Click to preview"
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        Proof Attached
      </button>
    );
  }

  if (resolvedStatus === 'Proof Missing') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ${className}`}
        title="Proof is required for this transaction but missing"
      >
        <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        Proof Missing
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${className}`}
      title="No proof required"
    >
      <MinusCircle className="w-3 h-3 text-slate-400" />
      Not Required
    </span>
  );
};
