import React, { useEffect, useState } from 'react';
import { bookingService } from '../../services/bookingService';
import { roomService } from '../../services/roomService';
import { packageService } from '../../services/packageService';
import { Booking, Room, Package } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { useToast } from '../../context/ToastContext';
import { Plus, DoorOpen, Calendar, CheckCircle, XCircle } from 'lucide-react';

export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    guest_name: '',
    contact_no: '',
    email: '',
    room_id: '',
    bed_id: '',
    package_id: '',
    booking_date: new Date().toISOString().split('T')[0],
    check_in_date: new Date().toISOString().split('T')[0],
    expected_check_out_date: '',
    advance_amount: '2000',
    notes: '',
  });

  const { success, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [bkgs, rms, pkgs] = await Promise.all([
        bookingService.getBookings(statusFilter || undefined),
        roomService.getRooms(),
        packageService.getPackages(),
      ]);
      setBookings(bkgs);
      setRooms(rms);
      setPackages(pkgs);
    } catch (err) {
      toastError('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleRoomChange = (roomId: string) => {
    setFormData((prev) => ({ ...prev, room_id: roomId, bed_id: '' }));
  };

  const currentRoom = rooms.find((r) => r.id.toString() === formData.room_id);
  const availableBeds = currentRoom ? currentRoom.beds.filter((b) => !b.is_occupied) : [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guest_name || !formData.contact_no || !formData.room_id || !formData.bed_id) {
      toastError('Please fill in guest name, contact, room, and bed');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        guest_name: formData.guest_name,
        contact_no: formData.contact_no,
        email: formData.email || null,
        room_id: parseInt(formData.room_id),
        bed_id: parseInt(formData.bed_id),
        package_id: formData.package_id ? parseInt(formData.package_id) : null,
        booking_date: formData.booking_date,
        check_in_date: formData.check_in_date,
        expected_check_out_date: formData.expected_check_out_date || null,
        advance_amount: parseFloat(formData.advance_amount) || 0,
        notes: formData.notes || null,
      };

      await bookingService.createBooking(payload);
      success('Booking reserved successfully!', 'Booking Confirmed');
      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Booking failed', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      await bookingService.checkInBooking(id);
      success('Booking checked in! Admission record created and bed occupied.', 'Check-In Complete');
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Check-in failed');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await bookingService.cancelBooking(id);
      success('Booking cancelled.');
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Cancellation failed');
    }
  };

  const columns: Column<Booking>[] = [
    {
      header: 'Guest Name',
      accessor: (item) => (
        <div>
          <div className="font-bold text-navy-900">{item.guest_name}</div>
          <div className="text-xs text-slate-400 font-medium">{item.contact_no}</div>
        </div>
      ),
    },
    {
      header: 'Reserved Bed',
      accessor: (item) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <DoorOpen className="w-3.5 h-3.5 text-secondary" />
          <span>
            Room {item.room?.room_number} • Bed {item.bed?.bed_number}
          </span>
        </div>
      ),
    },
    {
      header: 'Check-in Date',
      accessor: (item) => (
        <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.check_in_date}</span>
        </div>
      ),
    },
    {
      header: 'Advance Paid',
      accessor: (item) => <span className="text-xs font-bold text-emerald-600">₹{item.advance_amount}</span>,
    },
    {
      header: 'Status',
      accessor: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (item) => (
        <div className="flex items-center justify-end gap-2">
          {item.status === 'Confirmed' && (
            <>
              <button
                onClick={() => handleCheckIn(item.id)}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                title="Check in guest"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Check In</span>
              </button>
              <button
                onClick={() => handleCancel(item.id)}
                className="px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Cancel booking"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Advance Bookings"
        subtitle="Reserve hostel beds in advance, record advance payments, and convert to admission on arrival"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setFormData({
                guest_name: '',
                contact_no: '',
                email: '',
                room_id: rooms[0]?.id.toString() || '',
                bed_id: '',
                package_id: packages[0]?.id.toString() || '',
                booking_date: new Date().toISOString().split('T')[0],
                check_in_date: new Date().toISOString().split('T')[0],
                expected_check_out_date: '',
                advance_amount: '2000',
                notes: '',
              });
              setIsCreateOpen(true);
            }}
          >
            New Booking
          </Button>
        }
      />

      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-navy-900"
          >
            <option value="">All Bookings</option>
            <option value="Confirmed">Confirmed Reservations</option>
            <option value="CheckedIn">Checked In</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No booking records found."
      />

      {/* CREATE BOOKING MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Reserve Room & Bed"
        subtitle="Select bed and record advance booking deposit"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Guest Name"
              placeholder="e.g. Vikram Verma"
              value={formData.guest_name}
              onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
              required
            />
            <Input
              label="Contact No"
              placeholder="e.g. +91 98765 67890"
              value={formData.contact_no}
              onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Room"
              value={formData.room_id}
              onChange={(e) => handleRoomChange(e.target.value)}
              options={[
                { value: '', label: 'Select Room...' },
                ...rooms.map((r) => ({
                  value: r.id,
                  label: `Room ${r.room_number} (Fl ${r.floor} • ${r.vacant_count} vacant)`,
                })),
              ]}
              required
            />
            <Select
              label="Select Available Bed"
              value={formData.bed_id}
              onChange={(e) => setFormData({ ...formData, bed_id: e.target.value })}
              options={[
                { value: '', label: availableBeds.length > 0 ? 'Select Bed...' : 'No vacant beds' },
                ...availableBeds.map((b) => ({
                  value: b.id,
                  label: `Bed ${b.bed_number}`,
                })),
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Check-In Date"
              type="date"
              value={formData.check_in_date}
              onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
              required
            />
            <Input
              label="Advance Amount (₹)"
              type="number"
              value={formData.advance_amount}
              onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Confirm Booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
