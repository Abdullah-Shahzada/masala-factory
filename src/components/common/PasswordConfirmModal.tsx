import React, { useState } from 'react';
import { Modal } from './Modal';
import { Lock, ShieldAlert, KeyRound } from 'lucide-react';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  description: string;
  confirmText?: string;
  isDanger?: boolean;
}

export const PasswordConfirmModal: React.FC<PasswordConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm Password',
  isDanger = true
}) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter verification password.');
      return;
    }
    setErrorMsg('');
    onConfirm(password);
    setPassword('');
  };

  const handleClose = () => {
    setPassword('');
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      subtitle="Security Verification Required"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{description}</p>
            <p className="text-[10px] opacity-80">
              Demo Verification: Enter password <code className="bg-amber-200/60 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">admin</code> or <code className="bg-amber-200/60 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">1234</code>.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Admin Password *
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              placeholder="Enter admin password (demo: admin)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-5 py-2 font-semibold text-white rounded-xl shadow-md ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
};
