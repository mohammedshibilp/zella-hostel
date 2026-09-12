import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { admissionService } from '../../services/admissionService';
import { roomService } from '../../services/roomService';
import { packageService } from '../../services/packageService';
import { Admission, Room, Package } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { useToast } from '../../context/ToastContext';
import { Plus, UserCheck, DoorOpen, Calendar, LogOut } from 'lucide-react';

export const AdmissionsPage: React.FC = () => {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const location = useLocation();
  const { success, error: toastError } = useToast();

  // Form State
  const [formData, setFormData] = useState({
    guest_name: '',
    contact_no: '',
    email: '',
    occupation: 'Studying',
    guardian_name: '',
    guardian_phone: '',
    address: '',
    id_proof_type: 'Aadhar Card',
    id_proof_number: '',
    room_id: '',
    bed_id: '',
    package_id: '',
    admission_date: new Date().toISOString().split('T')[0],
    security_deposit: '5000',
    monthly_fee: '6500',
    notes: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [adms, rms, pkgs] = await Promise.all([
        admissionService.getAdmissions({ status_filter: statusFilter || undefined }),
        roomService.getRooms(),
        packageService.getPackages(),
      ]);
      setAdmissions(adms);
      setRooms(rms);
      setPackages(pkgs);
    } catch (err) {
      toastError('Failed to load admissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Prepopulate form if coming from "Convert Enquiry"
  useEffect(() => {
    if (location.state) {
      const { guestName, contactNo, occupation, packageId } = location.state as any;
      setFormData((prev) => ({
        ...prev,
        guest_name: guestName || prev.guest_name,
        contact_no: contactNo || prev.contact_no,
        occupation: occupation || prev.occupation,
        package_id: packageId ? packageId.toString() : prev.package_id,
      }));
      setIsModalOpen(true);
    }
  }, [location.state]);

  // When room changes, clear bed
  const handleRoomChange = (roomId: string) => {
    setFormData((prev) => ({ ...prev, room_id: roomId, bed_id: '' }));
  };

  // When package changes, update fee and deposit defaults
  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find((p) => p.id.toString() === packageId);
    if (pkg) {
      setFormData((prev) => ({
        ...prev,
        package_id: packageId,
        monthly_fee: pkg.monthly_fee.toString(),
        security_deposit: pkg.security_deposit.toString(),
      }));
    } else {
      setFormData((prev) => ({ ...prev, package_id: packageId }));
    }
  };

  // Get available beds for currently selected room
  const currentRoom = rooms.find((r) => r.id.toString() === formData.room_id);
  const availableBeds = currentRoom ? currentRoom.beds.filter((b) => !b.is_occupied) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guest_name || !formData.contact_no || !formData.room_id || !formData.bed_id) {
      toastError('Please fill in guest details, room, and bed');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        guest_name: formData.guest_name,
        contact_no: formData.contact_no,
        email: formData.email || null,
        occupation: formData.occupation,
        guardian_name: formData.guardian_name || null,
        guardian_phone: formData.guardian_phone || null,
        address: formData.address || null,
        id_proof_type: formData.id_proof_type,
        id_proof_number: formData.id_proof_number || null,
        room_id: parseInt(formData.room_id),
        bed_id: parseInt(formData.bed_id),
        package_id: formData.package_id ? parseInt(formData.package_id) : null,
        admission_date: formData.admission_date,
        security_deposit: parseFloat(formData.security_deposit) || 0,
        monthly_fee: parseFloat(formData.monthly_fee) || 0,
        notes: formData.notes || null,
      };

      await admissionService.createAdmission(payload);
      success('Guest admitted successfully and bed assigned!', 'Admission Complete');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Admission failed', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutSubmit = async () => {
    if (!selectedAdmission) return;
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await admissionService.checkout(selectedAdmission.id, today, checkoutNotes);
      success(
        `Guest ${selectedAdmission.guest?.name} checked out and bed released!`,
        'Checkout Completed'
      );
      setIsCheckoutOpen(false);
      setSelectedAdmission(null);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Checkout failed', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Admission>[] = [
    {
      header: 'Guest Name',
      accessor: (item) => (
        <div>
          <div className="font-bold text-navy-900">{item.guest?.name}</div>
          <div className="text-xs text-slate-400 font-medium">{item.guest?.contact_no}</div>
        </div>
      ),
    },
    {
      header: 'Room & Bed',
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
      header: 'Admission Date',
      accessor: (item) => (
        <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.admission_date}</span>
        </div>
      ),
    },
    {
      header: 'Monthly Fee',
      accessor: (item) => <span className="text-xs font-bold text-navy-900">₹{item.monthly_fee}/mo</span>,
    },
    {
      header: 'Deposit',
      accessor: (item) => <span className="text-xs text-slate-600 font-medium">₹{item.security_deposit}</span>,
    },
    {
      header: 'Status',
      accessor: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (item) => (
        <div className="flex items-center justify-end">
          {item.status === 'Active' && (
            <button
              onClick={() => {
                setSelectedAdmission(item);
                setCheckoutNotes('');
                setIsCheckoutOpen(true);
              }}
              className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Checkout</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Hostel Admissions"
        subtitle="Manage resident check-ins, room and bed allocations, and vacating checkouts"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setFormData({
                guest_name: '',
                contact_no: '',
                email: '',
                occupation: 'Studying',
                guardian_name: '',
                guardian_phone: '',
                address: '',
                id_proof_type: 'Aadhar Card',
                id_proof_number: '',
                room_id: rooms[0]?.id.toString() || '',
                bed_id: '',
                package_id: packages[0]?.id.toString() || '',
                admission_date: new Date().toISOString().split('T')[0],
                security_deposit: '5000',
                monthly_fee: '6500',
                notes: '',
              });
              setIsModalOpen(true);
            }}
          >
            New Admission
          </Button>
        }
      />

      {/* FILTER BAR */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-navy-900"
          >
            <option value="">All Admissions</option>
            <option value="Active">Active Residents</option>
            <option value="CheckedOut">Checked Out</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable
        columns={columns}
        data={admissions}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No admission records found."
      />

      {/* NEW ADMISSION MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Resident Admission"
        subtitle="Fill in resident details and assign an available room and bed"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="text-xs font-bold text-primary uppercase tracking-wider border-b border-slate-100 pb-1">
            Personal & Contact Info
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Guest Full Name"
              placeholder="e.g. Ananya Patel"
              value={formData.guest_name}
              onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
              required
            />
            <Input
              label="Contact Number"
              placeholder="e.g. +91 98765 12345"
              value={formData.contact_no}
              onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="ananya@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Select
              label="Occupation"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              options={[
                { value: 'Studying', label: 'Studying' },
                { value: 'Working', label: 'Working' },
              ]}
            />
            <Input
              label="ID Proof Number"
              placeholder="Aadhar / Govt ID"
              value={formData.id_proof_number}
              onChange={(e) => setFormData({ ...formData, id_proof_number: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Guardian Name"
              placeholder="Parent / Guardian"
              value={formData.guardian_name}
              onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
            />
            <Input
              label="Guardian Contact"
              placeholder="Guardian Phone"
              value={formData.guardian_phone}
              onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
            />
          </div>

          <div className="text-xs font-bold text-primary uppercase tracking-wider border-b border-slate-100 pb-1 pt-2">
            Room, Bed & Fee Allocation
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Room (from 23 rooms)"
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
                { value: '', label: availableBeds.length > 0 ? 'Select Bed...' : 'No vacant beds in this room' },
                ...availableBeds.map((b) => ({
                  value: b.id,
                  label: `Bed ${b.bed_number}`,
                })),
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Package"
              value={formData.package_id}
              onChange={(e) => handlePackageChange(e.target.value)}
              options={[
                { value: '', label: 'Select Package...' },
                ...packages.map((pkg) => ({
                  value: pkg.id,
                  label: `${pkg.name} (₹${pkg.monthly_fee})`,
                })),
              ]}
            />
            <Input
              label="Monthly Fee (₹)"
              type="number"
              value={formData.monthly_fee}
              onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
              required
            />
            <Input
              label="Security Deposit (₹)"
              type="number"
              value={formData.security_deposit}
              onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Complete Admission
            </Button>
          </div>
        </form>
      </Modal>

      {/* CHECKOUT CONFIRMATION MODAL */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Confirm Resident Checkout"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to check out <strong>{selectedAdmission?.guest?.name}</strong> from{' '}
            <strong>
              Room {selectedAdmission?.room?.room_number}, Bed {selectedAdmission?.bed?.bed_number}
            </strong>
            ? This will immediately release the bed and mark it vacant.
          </p>

          <Input
            label="Checkout Remarks / Security Deposit Settlement"
            placeholder="e.g. Deposit refunded in cash after room inspection"
            value={checkoutNotes}
            onChange={(e) => setCheckoutNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCheckoutSubmit} isLoading={isSubmitting}>
              Confirm Checkout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
