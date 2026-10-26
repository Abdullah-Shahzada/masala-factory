import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

export type ConfirmActionType = 'delete' | 'restore' | 'permanentDelete';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmActionType;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  type = 'delete',
  isDanger
}) => {
  // Determine standard title, message, and button labels according to specification
  let defaultTitle = 'Confirm Action';
  let defaultMessage = 'Are you sure you want to proceed?';
  let defaultConfirmText = 'Confirm';
  let danger = isDanger ?? true;

  if (type === 'delete') {
    defaultTitle = 'Delete Record';
    defaultMessage = 'Are you sure you want to delete this record?';
    defaultConfirmText = 'Delete';
    danger = true;
  } else if (type === 'restore') {
    defaultTitle = 'Restore Record';
    defaultMessage = 'Are you sure you want to restore this record?';
    defaultConfirmText = 'Restore';
    danger = false;
  } else if (type === 'permanentDelete') {
    defaultTitle = 'Permanently Delete Record';
    defaultMessage = 'Are you sure you want to permanently delete this record? This action cannot be undone.';
    defaultConfirmText = 'Permanently Delete';
    danger = true;
  }

  const finalTitle = title || defaultTitle;
  const finalMessage = message || defaultMessage;
  const finalConfirmText = confirmText || defaultConfirmText;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={finalTitle}
      maxWidth="sm"
    >
      <div className="space-y-4 text-xs">
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
          type === 'restore'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            : type === 'permanentDelete'
            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-200'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
        }`}>
          {type === 'restore' ? (
            <RotateCcw className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : type === 'permanentDelete' ? (
            <Trash2 className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold text-sm leading-snug">
              {finalMessage}
            </p>
            {type === 'permanentDelete' && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                Warning: Permanent deletion cannot be reversed.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
            }`}
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
