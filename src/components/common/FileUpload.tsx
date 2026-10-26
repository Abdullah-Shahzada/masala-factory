import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { ProofStatus } from '../../types';

interface FileUploadProps {
  label?: string;
  proofUrl?: string;
  value?: string;
  onProofChange?: (url: string, status: ProofStatus) => void;
  onChange?: (url: string) => void;
  required?: boolean;
  helperText?: string;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = 'Payment Proof / Photo Receipt',
  proofUrl,
  value,
  onProofChange,
  onChange,
  required = false,
  helperText,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentProof = value || proofUrl;

  const updateProof = (url: string, status: ProofStatus) => {
    if (onProofChange) onProofChange(url, status);
    if (onChange) onChange(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local data URL using FileReader so it previews and displays in the session
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      updateProof(result, 'Proof Attached');
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    updateProof('', required ? 'Proof Missing' : 'Not Required');
  };

  return (
    <div className={`space-y-1.5 text-xs ${className}`}>
      <div className="flex items-center justify-between">
        <label className="font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {currentProof ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Proof Attached
          </span>
        ) : required ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3 h-3" />
            Proof Required
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Optional</span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {currentProof ? (
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
              <img
                src={currentProof}
                alt="Uploaded Proof"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="truncate">
              <span className="block font-semibold text-slate-800 dark:text-slate-200 truncate">
                Photo Proof Selected
              </span>
              <span className="text-[10px] text-slate-400 block">
                Session preview active (tap to change)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 transition-colors"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-3 text-center transition-all bg-white dark:bg-slate-900/40 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-1"
        >
          <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
            Upload Photo Proof / Receipt
          </span>
          <span className="text-[10px] text-slate-400">
            Select image from device camera or gallery (JPG, PNG, WebP)
          </span>
        </button>
      )}
    </div>
  );
};
