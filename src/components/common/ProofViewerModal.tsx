import React from 'react';
import { Modal } from './Modal';
import { FileText, ExternalLink, Download } from 'lucide-react';

interface ProofViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  proofUrl?: string;
  documentNumber?: string;
  notes?: string;
}

export const ProofViewerModal: React.FC<ProofViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  proofUrl,
  documentNumber,
  notes
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={documentNumber ? `Document Reference: ${documentNumber}` : 'Attachment Preview'}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {proofUrl ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-2">
            <img 
              src={proofUrl} 
              alt="Proof Document Attachment" 
              className="max-h-96 object-contain rounded-lg shadow-md"
            />
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Attachment Uploaded</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              No photo or scanned document proof was attached for this transaction record.
            </p>
          </div>
        )}

        {notes && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Record Notes & Description:</span>
            <p className="text-slate-600 dark:text-slate-400">{notes}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {proofUrl && (
            <a 
              href={proofUrl} 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Original
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </Modal>
  );
};
