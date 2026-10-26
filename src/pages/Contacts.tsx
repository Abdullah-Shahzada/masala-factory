import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Party, PartyType } from '../types';
import { formatPKR } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { 
  Users, 
  Plus, 
  Search, 
  BookOpen, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Building, 
  Eye, 
  Filter,
  CheckCircle,
  Pencil,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const { parties, addParty, updateParty, softDeleteParty, salesBills, paymentsReceived, purchases } = useApp();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Party | null>(null);
  const [editingContact, setEditingContact] = useState<Party | null>(null);
  const [deletingContact, setDeletingContact] = useState<Party | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [type, setType] = useState<PartyType>('Customer');
  const [notes, setNotes] = useState<string>('');

  const openAddModal = () => {
    resetForm();
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Party) => {
    setEditingContact(contact);
    setName(contact.name);
    setCompanyName(contact.companyName || '');
    setPhone(contact.phone);
    setWhatsapp(contact.whatsapp || contact.phone);
    setAddress(contact.address || '');
    setCity(contact.city || '');
    setType(contact.type);
    setNotes(contact.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    if (editingContact) {
      const res = updateParty(editingContact.id, {
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        address: address.trim(),
        city,
        type,
        notes: notes.trim() || undefined
      });
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
      } else {
        setActionFeedback({ type: 'error', message: res.message });
      }
      if (selectedContact?.id === editingContact.id) {
        setSelectedContact(prev => prev ? { ...prev, name: name.trim(), companyName: companyName.trim() || undefined, phone: phone.trim(), whatsapp: whatsapp.trim() || phone.trim(), address: address.trim(), city, type, notes: notes.trim() || undefined } : null);
      }
    } else {
      addParty({
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        address: address.trim(),
        city,
        type,
        notes: notes.trim() || undefined
      });
      setActionFeedback({ type: 'success', message: `Contact party "${name.trim()}" created successfully.` });
    }

    setIsModalOpen(false);
    resetForm();
    setEditingContact(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingContact) return;
    const res = softDeleteParty(deletingContact.id);
    if (res.success) {
      setActionFeedback({ type: 'success', message: res.message });
      if (selectedContact?.id === deletingContact.id) {
        setSelectedContact(null);
      }
      setDeletingContact(null);
    } else {
      setActionFeedback({ type: 'error', message: res.message });
    }
  };

  const resetForm = () => {
    setName('');
    setCompanyName('');
    setPhone('');
    setWhatsapp('');
    setAddress('');
    setCity('');
    setType('Customer');
    setNotes('');
  };

  // Active parties (filter out soft-deleted)
  const activeParties = parties.filter(p => !p.isDeleted);

  // Distinct cities from active parties
  const cities = Array.from(new Set(activeParties.map(p => p.city))).filter(Boolean);

  // Filter parties
  const filteredParties = activeParties.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (cityFilter !== 'all' && p.city !== cityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCompany = p.companyName?.toLowerCase().includes(q);
      const matchPhone = p.phone.includes(q);
      const matchCity = p.city.toLowerCase().includes(q);
      if (!matchName && !matchCompany && !matchPhone && !matchCity) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Contacts & B2B Parties Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Central registry of customers, spice suppliers, and combined wholesale partners with direct ledger links.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Contact / Party
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Type and City Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Type:
          </span>
          {['all', 'Customer', 'Supplier', 'Both'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                typeFilter === t
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {t === 'all' ? 'All Parties' : t}
            </button>
          ))}

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Cities</option>
            {cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Local Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search party by name, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParties.length > 0 ? (
          filteredParties.map(party => {
            // Compute quick aggregates for party (exclude soft-deleted bills)
            const partyBills = salesBills.filter(b => b.partyId === party.id && !b.isDeleted);
            const totalSales = partyBills.reduce((sum, b) => sum + b.grandTotal, 0);
            const totalOutstanding = partyBills.reduce((sum, b) => sum + b.remainingAmount, 0);

            return (
              <div 
                key={party.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {party.name}
                      </h3>
                      {party.companyName && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                          {party.companyName}
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      party.type === 'Customer' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      party.type === 'Supplier' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    }`}>
                      {party.type}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{party.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      <span>WhatsApp: {party.whatsapp}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{party.address}, {party.city}</span>
                    </div>
                  </div>

                  {party.type !== 'Supplier' && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Invoiced</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatPKR(totalSales)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Outstanding</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{formatPKR(totalOutstanding)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedContact(party)}
                      className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="View Contact Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(party)}
                      className="p-2 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                      title="Edit Contact"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingContact(party)}
                      className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => navigate(`/ledger?partyId=${party.id}`)}
                    className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Open Ledger
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No contacts found matching your query.
          </div>
        )}
      </div>

      {/* CREATE / EDIT CONTACT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContact(null);
        }}
        title={editingContact ? `Edit Contact — ${editingContact.name}` : "Add New Business Contact / Party"}
        subtitle={editingContact ? `Update contact details and sync across system records` : "Customer, Spice Supplier, or Combined Partner"}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contact / Party Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Al-Madina Cash & Carry"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company / Business Name
              </label>
              <input
                type="text"
                placeholder="e.g. Al-Madina Group"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Party Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PartyType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                required
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                placeholder="Main Market / Industrial Area"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes & Credit Terms
            </label>
            <input
              type="text"
              placeholder="e.g. 15-day credit window limit Rs. 200,000"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingContact(null);
              }}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-white bg-emerald-600 rounded-xl font-semibold shadow-md hover:bg-emerald-700 transition-colors"
            >
              {editingContact ? 'Update Contact' : 'Save Contact'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONTACT DETAILS DRAWER */}
      {selectedContact && (
        <Modal
          isOpen={!!selectedContact}
          onClose={() => setSelectedContact(null)}
          title={`Contact Details — ${selectedContact.name}`}
          subtitle={`Type: ${selectedContact.type} | ID: ${selectedContact.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Company:</span>
                <span className="font-semibold">{selectedContact.companyName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span>{selectedContact.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">WhatsApp:</span>
                <span>{selectedContact.whatsapp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">City / Address:</span>
                <span>{selectedContact.address}, {selectedContact.city}</span>
              </div>
            </div>

            {selectedContact.notes && (
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                <strong>Notes:</strong> {selectedContact.notes}
              </div>
            )}

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const toEdit = selectedContact;
                    setSelectedContact(null);
                    openEditModal(toEdit);
                  }}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    const toDelete = selectedContact;
                    setSelectedContact(null);
                    setDeletingContact(toDelete);
                  }}
                  className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <button
                onClick={() => {
                  const partyId = selectedContact.id;
                  setSelectedContact(null);
                  navigate(`/ledger?partyId=${partyId}`);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Open Party Ledger
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL FOR DELETION */}
      <ConfirmModal
        isOpen={!!deletingContact}
        onClose={() => setDeletingContact(null)}
        onConfirm={handleDeleteConfirm}
        type="delete"
        title="Delete Contact"
        message="Are you sure you want to delete this record?"
        confirmText="Delete"
      />

    </div>
  );
};
