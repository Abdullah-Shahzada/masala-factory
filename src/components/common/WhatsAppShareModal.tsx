import React, { useState } from 'react';
import { Modal } from './Modal';
import { generateWhatsAppLink, normalizePakistanPhone } from '../../utils/whatsappHelper';
import { MessageSquare, ExternalLink, Copy, Check, FileDown, AlertTriangle } from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  defaultPhone?: string;
  partyName?: string;
  recipientLabel?: string;
  referenceNumber?: string;
  defaultMessage: string;
  documentTitle?: string;
  onDownloadPdf?: () => void;
  onDownloadDocument?: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  title = 'Share via WhatsApp',
  defaultPhone = '',
  partyName = 'Party',
  recipientLabel,
  referenceNumber,
  defaultMessage,
  documentTitle,
  onDownloadPdf,
  onDownloadDocument
}) => {
  const effectiveRecipient = recipientLabel || partyName;
  const effectiveDownload = onDownloadPdf || onDownloadDocument;
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);

  // Sync state if default values change
  React.useEffect(() => {
    setPhone(defaultPhone);
    setMessage(defaultMessage);
  }, [defaultPhone, defaultMessage]);

  const normalizedNumber = normalizePakistanPhone(phone);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleOpenWhatsApp = () => {
    const url = generateWhatsAppLink(phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`Send formatted statement or voucher details to ${partyName}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Recipient Phone */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Destination Phone / WhatsApp Number:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +92 300 1234567 or 03001234567"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {normalizedNumber ? (
              <span className="px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] flex items-center font-semibold">
                +{normalizedNumber}
              </span>
            ) : (
              <span className="px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] flex items-center font-medium">
                No number
              </span>
            )}
          </div>
          {!phone.trim() && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Party does not have a saved phone. You can enter one manually or copy the text.
            </p>
          )}
        </div>

        {/* Message preview & edit */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Formatted Message Content:
            </label>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* PDF Attachment Guidance */}
        {(documentTitle || effectiveDownload) && (
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Document Attachment: {documentTitle || 'Printable Statement / Voucher'}
              </span>
              {effectiveDownload && (
                <button
                  type="button"
                  onClick={effectiveDownload}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                >
                  <FileDown className="w-3 h-3" /> Download Document
                </button>
              )}
            </div>
            <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-normal">
              <strong>Notice:</strong> Browser WhatsApp links share formatted text directly. To attach the PDF or receipt photo, download the document above and attach it manually inside WhatsApp.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Open in WhatsApp
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
