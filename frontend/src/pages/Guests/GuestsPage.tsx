import React, { useEffect, useState } from 'react';
import { guestService } from '../../services/guestService';
import { Guest } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { Search, DoorOpen, Phone, Mail, Shield } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const GuestsPage: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const { error: toastError } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await guestService.getGuests({
        status_filter: statusFilter || undefined,
        search: search || undefined,
      });
      setGuests(data);
    } catch (err) {
      toastError('Failed to load guest directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const columns: Column<Guest>[] = [
    {
      header: 'Guest Name',
      accessor: (item) => (
        <div>
          <div className="font-bold text-navy-900">{item.name}</div>
          <div className="text-xs text-slate-400 font-medium">{item.occupation}</div>
        </div>
      ),
    },
    {
      header: 'Contact',
      accessor: (item) => (
        <div>
          <div className="text-xs font-semibold text-navy-900 flex items-center gap-1">
            <Phone className="w-3 h-3 text-secondary" />
            <span>{item.contact_no}</span>
          </div>
          {item.email && <div className="text-[11px] text-slate-400">{item.email}</div>}
        </div>
      ),
    },
    {
      header: 'Room & Bed',
      accessor: (item) =>
        item.room_number ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <DoorOpen className="w-3.5 h-3.5 text-secondary" />
            <span>
              Room {item.room_number} • Bed {item.bed_number}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Not Assigned</span>
        ),
    },
    {
      header: 'Guardian',
      accessor: (item) => (
        <div className="text-xs text-slate-600 font-medium">
          <div>{item.guardian_name || '—'}</div>
          {item.guardian_phone && <div className="text-[11px] text-slate-400">{item.guardian_phone}</div>}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: 'View',
      align: 'right',
      accessor: (item) => (
        <button
          onClick={() => setSelectedGuest(item)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Details
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Guest Directory"
        subtitle="Comprehensive database of all registered hostel residents and past guests"
      />

      {/* FILTER & SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, contact, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-navy-900"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-navy-900"
          >
            <option value="">All Guests</option>
            <option value="Active">Active Residents</option>
            <option value="Vacated">Vacated</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={guests}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No guests found."
      />

      {/* GUEST DETAIL MODAL */}
      <Modal
        isOpen={!!selectedGuest}
        onClose={() => setSelectedGuest(null)}
        title={selectedGuest?.name || 'Guest Details'}
        subtitle="Resident KYC and Profile"
        maxWidth="md"
      >
        {selectedGuest && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium block">Contact Number</span>
                <span className="text-sm font-bold text-navy-900">{selectedGuest.contact_no}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Email Address</span>
                <span className="text-sm font-bold text-navy-900">{selectedGuest.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Occupation</span>
                <span className="text-sm font-bold text-navy-900">{selectedGuest.occupation}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Status</span>
                <StatusBadge status={selectedGuest.status} />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Room Allocation</span>
              <div className="text-sm font-extrabold text-primary">
                {selectedGuest.room_number ? (
                  `Room ${selectedGuest.room_number} • Bed ${selectedGuest.bed_number}`
                ) : (
                  <span className="text-slate-400 font-normal">Not currently allocated to any room</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Emergency & KYC</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block">Guardian:</span>
                  <span className="font-bold text-navy-900">{selectedGuest.guardian_name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Guardian Phone:</span>
                  <span className="font-bold text-navy-900">{selectedGuest.guardian_phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ID Proof:</span>
                  <span className="font-bold text-navy-900">{selectedGuest.id_proof_type || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ID Number:</span>
                  <span className="font-bold text-navy-900">{selectedGuest.id_proof_number || '—'}</span>
                </div>
              </div>
              {selectedGuest.address && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block">Permanent Address:</span>
                  <span className="font-medium text-navy-900">{selectedGuest.address}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
