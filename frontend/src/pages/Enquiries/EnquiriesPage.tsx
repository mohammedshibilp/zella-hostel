import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enquiryService } from '../../services/enquiryService';
import { packageService } from '../../services/packageService';
import { Enquiry, Package } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  Search,
  Filter,
  UserCheck,
  Phone,
  Calendar,
  Trash2,
  Edit2,
} from 'lucide-react';

export const EnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>('');

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    mode: 'Walk-in',
    occupation: 'Studying',
    approx_coming_date: '',
    package_id: '',
    contact_no: '',
    current_status: 'Open',
    notes: '',
  });

  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [enqs, pkgs] = await Promise.all([
        enquiryService.getEnquiries({
          mode: modeFilter || undefined,
          current_status: statusFilter || undefined,
          search: search || undefined,
        }),
        packageService.getPackages(),
      ]);
      setEnquiries(enqs);
      setPackages(pkgs);
    } catch (err) {
      toastError('Failed to fetch enquiries', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, modeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenCreate = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      name: '',
      mode: 'Walk-in',
      occupation: 'Studying',
      approx_coming_date: '',
      package_id: packages[0]?.id.toString() || '',
      contact_no: '',
      current_status: 'Open',
      notes: '',
    });
    setEditingEnquiry(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (enq: Enquiry) => {
    setEditingEnquiry(enq);
    setFormData({
      date: enq.date,
      name: enq.name,
      mode: enq.mode,
      occupation: enq.occupation,
      approx_coming_date: enq.approx_coming_date || '',
      package_id: enq.package_id?.toString() || '',
      contact_no: enq.contact_no,
      current_status: enq.current_status,
      notes: enq.notes || '',
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact_no) {
      toastError('Please fill in required fields (Name and Contact Number)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        package_id: formData.package_id ? parseInt(formData.package_id) : null,
        approx_coming_date: formData.approx_coming_date || null,
      };

      if (editingEnquiry) {
        await enquiryService.updateEnquiry(editingEnquiry.id, payload);
        success('Enquiry updated successfully', 'Updated');
      } else {
        await enquiryService.createEnquiry(payload);
        success('New enquiry logged successfully', 'Created');
      }

      setIsCreateOpen(false);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to save enquiry', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
    try {
      await enquiryService.deleteEnquiry(id);
      success('Enquiry deleted');
      loadData();
    } catch (err) {
      toastError('Failed to delete enquiry');
    }
  };

  const handleConvertToAdmission = (enq: Enquiry) => {
    // Navigate to Admission page with query params to prefill
    navigate('/admissions', {
      state: {
        enquiryId: enq.id,
        guestName: enq.name,
        contactNo: enq.contact_no,
        occupation: enq.occupation,
        packageId: enq.package_id,
      },
    });
  };

  const columns: Column<Enquiry>[] = [
    {
      header: 'Date',
      accessor: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.date}</span>
        </div>
      ),
    },
    {
      header: 'Name',
      accessor: (item) => (
        <div>
          <div className="font-bold text-navy-900">{item.name}</div>
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Phone className="w-3 h-3 text-secondary" />
            <span>{item.contact_no}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Mode',
      accessor: (item) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
          {item.mode}
        </span>
      ),
    },
    {
      header: 'Occupation',
      accessor: (item) => <span className="text-xs text-slate-600 font-medium">{item.occupation}</span>,
    },
    {
      header: 'Approx Coming',
      accessor: (item) => (
        <span className="text-xs text-slate-600 font-medium">
          {item.approx_coming_date || <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      header: 'Package Required',
      accessor: (item) => (
        <span className="text-xs font-semibold text-primary">
          {item.package?.name || 'Standard Package'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (item) => <StatusBadge status={item.current_status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          {item.current_status === 'Open' && (
            <button
              onClick={() => handleConvertToAdmission(item)}
              title="Convert to Admission"
              className="p-1.5 text-secondary hover:bg-secondary-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Admit</span>
            </button>
          )}
          <button
            onClick={() => handleOpenEdit(item)}
            title="Edit"
            className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            title="Delete"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Enquiry Management"
        subtitle="Record and track candidate hostel inquiries from walk-ins and phone calls"
        actions={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            New Enquiry
          </Button>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or contact number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-2 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Modes</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Call">Call</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-2 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Converted">Converted</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable
        columns={columns}
        data={enquiries}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No enquiry records match your filters."
      />

      {/* CREATE / EDIT ENQUIRY MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingEnquiry ? 'Edit Enquiry' : 'Record New Enquiry'}
        subtitle="Fill in prospective candidate requirements"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Input
              label="Candidate Name"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact No"
              placeholder="e.g. +91 98765 43210"
              value={formData.contact_no}
              onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
              required
            />
            <Select
              label="Mode"
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              options={[
                { value: 'Walk-in', label: 'Walk-in' },
                { value: 'Call', label: 'Call' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Working / Studying"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              options={[
                { value: 'Studying', label: 'Studying' },
                { value: 'Working', label: 'Working' },
              ]}
            />
            <Input
              label="Approximate Coming Date"
              type="date"
              value={formData.approx_coming_date}
              onChange={(e) => setFormData({ ...formData, approx_coming_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Which Package Required?"
              value={formData.package_id}
              onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
              options={[
                { value: '', label: 'Select Required Package...' },
                ...packages.map((pkg) => ({
                  value: pkg.id,
                  label: `${pkg.name} (₹${pkg.monthly_fee}/mo)`,
                })),
              ]}
            />
            <Select
              label="Current Status"
              value={formData.current_status}
              onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
              options={[
                { value: 'Open', label: 'Open' },
                { value: 'Converted', label: 'Converted' },
                { value: 'Closed', label: 'Closed' },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Notes & Preferences
            </label>
            <textarea
              rows={3}
              placeholder="Candidate food preferences, budget, joining timeline..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              {editingEnquiry ? 'Save Changes' : 'Record Enquiry'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
