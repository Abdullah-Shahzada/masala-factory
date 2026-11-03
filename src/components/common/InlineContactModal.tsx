import React, { useState } from 'react';
import { Modal } from './Modal';
import { Party, PartyType } from '../../types';
import { useApp } from '../../context/AppContext';
import { Users, UserPlus } from 'lucide-react';

interface InlineContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newParty: Party) => void;
  defaultType?: PartyType;
}

export const InlineContactModal: React.FC<InlineContactModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  defaultType = 'Customer'
}) => {
  const { parties, addParty } = useApp();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState<PartyType>(defaultType);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Party / Business name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Contact phone number is required.');
      return;
    }

    // Check for duplicate party among active directory contacts
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    const duplicate = parties.find(p => {
      if (p.isDeleted) return false;
      const pName = (p.name || '').trim().toLowerCase();
      const pPhone = (p.phone || '').replace(/[^0-9]/g, '');
      const nameMatch = pName === name.trim().toLowerCase();
      const phoneMatch = cleanPhone.length >= 7 && pPhone.length >= 7 && pPhone.endsWith(cleanPhone.slice(-7));
      return nameMatch || phoneMatch;
    });

    if (duplicate) {
      setErrorMsg(`Party "${duplicate.name}" already exists in directory with matching details. Please select the existing contact or enter unique details.`);
      return;
    }

    const createdParty = addParty({
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      address: address.trim(),
      city,
      type,
      notes: notes.trim() || undefined
    });

    onCreated(createdParty);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setCompanyName('');
    setPhone('');
    setWhatsapp('');
    setAddress('');
    setCity('');
    setType(defaultType);
    setNotes('');
    setErrorMsg('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Contact / Party"
      subtitle="Adds to master directory & selects in current bill"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <span className="font-bold">Error:</span> {errorMsg}
          </div>
        )}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Party / Business Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Subhan Spice Mart"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Company Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Subhan Group"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Party Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PartyType)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="Customer">Customer (Buyer)</option>
              <option value="Supplier">Supplier (Vendor)</option>
              <option value="Both">Both Customer & Supplier</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              placeholder="+92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              WhatsApp Number
            </label>
            <input
              type="text"
              placeholder="+92 300 1234567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Street Address
            </label>
            <input
              type="text"
              placeholder="Main Market / Akbari Mandi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              City
            </label>
            <input
              type="text"
              placeholder="Enter city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Special credit terms"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Save & Select Contact</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
