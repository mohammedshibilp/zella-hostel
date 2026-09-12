import React, { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';
import { roomService } from '../../services/roomService';
import { Room } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { useToast } from '../../context/ToastContext';
import { Plus, Wrench, CheckCircle } from 'lucide-react';

export const OthersPage: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    room_id: '',
    title: '',
    description: '',
    cost: '0',
    status: 'Pending',
  });

  const { success, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [recs, rms] = await Promise.all([
        settingsService.getMaintenanceRecords(),
        roomService.getRooms(),
      ]);
      setRecords(recs);
      setRooms(rms);
    } catch (err) {
      toastError('Failed to load maintenance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.room_id || !formData.title) {
      toastError('Please specify room and maintenance title');
      return;
    }

    setIsSubmitting(true);
    try {
      await settingsService.createMaintenanceRecord({
        room_id: parseInt(formData.room_id),
        title: formData.title,
        description: formData.description || null,
        cost: parseFloat(formData.cost) || 0,
        status: formData.status,
      });
      success('Maintenance ticket logged successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to log maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await settingsService.updateMaintenanceStatus(id, 'Resolved');
      success('Ticket marked as resolved');
      loadData();
    } catch (err) {
      toastError('Failed to update ticket');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Room',
      accessor: (item) => <span className="font-extrabold text-primary">Room {item.room_number}</span>,
    },
    {
      header: 'Issue / Task',
      accessor: (item) => (
        <div>
          <div className="font-bold text-navy-900">{item.title}</div>
          {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
        </div>
      ),
    },
    {
      header: 'Reported Date',
      accessor: (item) => <span className="text-xs text-slate-600 font-medium">{item.reported_date}</span>,
    },
    {
      header: 'Cost (₹)',
      accessor: (item) => <span className="text-xs font-bold text-navy-900">₹{item.cost}</span>,
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
          {item.status !== 'Resolved' && (
            <button
              onClick={() => handleResolve(item.id)}
              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Resolve</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Others / Maintenance Records"
        subtitle="Manage room repairs, plumbing, electrical maintenance, and general hostel operational tasks"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setFormData({
                room_id: rooms[0]?.id.toString() || '',
                title: '',
                description: '',
                cost: '0',
                status: 'Pending',
              });
              setIsModalOpen(true);
            }}
          >
            Log Maintenance
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={records}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No maintenance tickets active."
      />

      {/* CREATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Room Maintenance Ticket"
        subtitle="Record repair work or maintenance cost"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select
            label="Room"
            value={formData.room_id}
            onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
            options={[
              { value: '', label: 'Select Room...' },
              ...rooms.map((r) => ({
                value: r.id,
                label: `Room ${r.room_number} (Floor ${r.floor})`,
              })),
            ]}
            required
          />

          <Input
            label="Issue Title"
            placeholder="e.g. Geyser Repair / Tap leakage"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Provide repair details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Repair Cost (₹)"
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'Pending', label: 'Pending' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Resolved', label: 'Resolved' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
