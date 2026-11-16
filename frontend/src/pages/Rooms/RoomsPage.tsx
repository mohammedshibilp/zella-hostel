import React, { useEffect, useState, useMemo } from 'react';
import { roomService } from '../../services/roomService';
import { Room, Bed, RoomCreatePayload, RoomUpdatePayload } from '../../types';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  DoorOpen,
  BedDouble,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

export const RoomsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [chartSummary, setChartSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);

  // Submitting states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUpdatingBed, setIsUpdatingBed] = useState<boolean>(false);

  // Form states
  const [roomFormData, setRoomFormData] = useState<RoomCreatePayload>({
    room_number: '',
    floor: 1,
    capacity: 2,
    room_type: 'Double Sharing',
    price: 0,
    status: 'Available',
    notes: '',
  });

  const [editFormData, setEditFormData] = useState<RoomUpdatePayload>({
    room_number: '',
    floor: 1,
    capacity: 2,
    room_type: 'Double Sharing',
    price: 0,
    status: 'Available',
    notes: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [roomsData, chartData] = await Promise.all([
        roomService.getRooms(
          selectedFloor !== null ? selectedFloor : undefined,
          statusFilter || undefined,
          selectedType || undefined,
          searchQuery || undefined
        ),
        roomService.getRoomChart(),
      ]);
      setRooms(roomsData);
      setChartSummary(chartData);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load room data', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFloor, statusFilter, selectedType]);

  // Handle live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Dynamic unique floors and types from loaded rooms
  const dynamicFloors = useMemo(() => {
    const floorsSet = new Set<number>();
    rooms.forEach((r) => floorsSet.add(r.floor));
    return Array.from(floorsSet).sort((a, b) => a - b);
  }, [rooms]);

  const dynamicTypes = useMemo(() => {
    const typesSet = new Set<string>();
    rooms.forEach((r) => {
      if (r.room_type) typesSet.add(r.room_type);
    });
    return Array.from(typesSet).sort();
  }, [rooms]);

  // Dynamic counts
  const totalRoomsCount = chartSummary?.total_rooms ?? rooms.length;
  const totalBedsCount = chartSummary?.total_beds ?? rooms.reduce((acc, r) => acc + (r.capacity || r.beds.length), 0);
  const occupiedBedsCount =
    chartSummary?.occupied_beds ??
    rooms.reduce((acc, r) => acc + (r.occupied_count ?? r.beds.filter((b) => b.is_occupied).length), 0);
  const vacantBedsCount =
    chartSummary?.vacant_beds ??
    Math.max(0, totalBedsCount - occupiedBedsCount);

  // Helper to format bed names nicely
  const formatBedName = (bedNum: string) => {
    if (!bedNum) return '';
    if (bedNum.includes('-Bed ')) {
      return bedNum.replace('-', ' – ');
    }
    if (bedNum.startsWith('Bed ')) {
      return bedNum;
    }
    return `Bed ${bedNum}`;
  };

  // --- Handlers ---
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomFormData.room_number.trim()) {
      toastError('Room number is required');
      return;
    }
    if (roomFormData.capacity < 1 || roomFormData.capacity > 50) {
      toastError('Capacity must be between 1 and 50 beds');
      return;
    }

    setIsSubmitting(true);
    try {
      await roomService.createRoom({
        room_number: roomFormData.room_number.trim(),
        floor: Number(roomFormData.floor),
        capacity: Number(roomFormData.capacity),
        room_type: roomFormData.room_type,
        price: Number(roomFormData.price) || 0,
        status: roomFormData.status || 'Available',
        notes: roomFormData.notes?.trim() || undefined,
      });

      success(`Room ${roomFormData.room_number} with ${roomFormData.capacity} beds created successfully!`, 'Room Created');
      setIsAddModalOpen(false);
      setRoomFormData({
        room_number: '',
        floor: 1,
        capacity: 2,
        room_type: 'Double Sharing',
        price: 0,
        status: 'Available',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create room', 'Creation Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (room: Room) => {
    setSelectedRoom(room);
    setEditFormData({
      room_number: room.room_number,
      floor: room.floor,
      capacity: room.capacity,
      room_type: room.room_type,
      price: room.price || 0,
      status: room.status,
      notes: room.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setIsSubmitting(true);
    try {
      await roomService.updateRoom(selectedRoom.id, {
        room_number: editFormData.room_number?.trim(),
        floor: Number(editFormData.floor),
        capacity: Number(editFormData.capacity),
        room_type: editFormData.room_type,
        price: Number(editFormData.price) || 0,
        status: editFormData.status,
        notes: editFormData.notes?.trim() || undefined,
      });

      success(`Room ${editFormData.room_number || selectedRoom.room_number} updated successfully!`, 'Room Updated');
      setIsEditModalOpen(false);
      setSelectedRoom(null);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update room', 'Update Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    setIsSubmitting(true);
    try {
      const res = await roomService.deleteRoom(selectedRoom.id);
      success(res.message || `Room ${selectedRoom.room_number} deleted.`, 'Room Deleted');
      setIsDeleteModalOpen(false);
      setSelectedRoom(null);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to delete room', 'Delete Blocked');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBedStatusChange = async (newStatus: string) => {
    if (!selectedBed) return;
    setIsUpdatingBed(true);
    try {
      await roomService.updateBedStatus(selectedBed.id, newStatus);
      success(`Bed ${selectedBed.bed_number} set to ${newStatus}`, 'Bed Updated');
      setSelectedBed(null);
      await loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update bed status', 'Error');
    } finally {
      setIsUpdatingBed(false);
    }
  };

  const handleAddBedToSelectedRoom = async () => {
    if (!selectedRoom) return;
    setIsSubmitting(true);
    try {
      await roomService.addBed(selectedRoom.id);
      success(`Bed added to Room ${selectedRoom.room_number}!`, 'Bed Added');
      const updated = await roomService.getRoom(selectedRoom.id);
      setSelectedRoom(updated);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to add bed', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBedFromRoom = async (bedId: number) => {
    if (!selectedRoom) return;
    if (!window.confirm('Are you sure you want to delete this bed?')) return;
    setIsSubmitting(true);
    try {
      await roomService.deleteBed(selectedRoom.id, bedId);
      success('Bed deleted successfully!', 'Bed Deleted');
      const updated = await roomService.getRoom(selectedRoom.id);
      setSelectedRoom(updated);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to delete bed', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto w-full">
      {/* PAGE HEADER */}
      <PageHeader
        title="Hostel Rooms & Bed Management"
        subtitle="Manage dynamic room inventories, bed capacities, and real-time resident occupancy"
        actions={
          isAdmin && (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setRoomFormData({
                  room_number: '',
                  floor: 1,
                  capacity: 2,
                  room_type: 'Double Sharing',
                  price: 0,
                  status: 'Available',
                  notes: '',
                });
                setIsAddModalOpen(true);
              }}
            >
              Add Room
            </Button>
          )
        }
      />

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <Card padding="sm" className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
            <DoorOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Total Rooms</div>
            <div className="text-lg sm:text-xl font-extrabold text-navy-900">{totalRoomsCount}</div>
          </div>
        </Card>

        <Card padding="sm" className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <BedDouble className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Total Beds</div>
            <div className="text-lg sm:text-xl font-extrabold text-navy-900">{totalBedsCount}</div>
          </div>
        </Card>

        <Card padding="sm" className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Occupied Beds</div>
            <div className="text-lg sm:text-xl font-extrabold text-rose-600">{occupiedBedsCount}</div>
          </div>
        </Card>

        <Card padding="sm" className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Vacant Beds</div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-600">{vacantBedsCount}</div>
          </div>
        </Card>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room number, type, or notes..."
            className="w-full text-xs font-medium pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-navy-900 placeholder:text-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Floor tabs */}
          {dynamicFloors.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto touch-scroll max-w-full">
              <button
                type="button"
                onClick={() => setSelectedFloor(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedFloor === null
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                All Floors
              </button>
              {dynamicFloors.map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setSelectedFloor(fl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedFloor === fl
                      ? 'bg-white text-navy-900 shadow-xs'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  Floor {fl}
                </button>
              ))}
            </div>
          )}

          {/* Room Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-2 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary flex-1 sm:flex-initial"
          >
            <option value="">All Room Types</option>
            {dynamicTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-2 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary flex-1 sm:flex-initial"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Full">Full</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* MAIN ROOMS CONTENT */}
      {isLoading ? (
        <LoadingState message="Loading hostel rooms and beds..." />
      ) : rooms.length === 0 ? (
        /* PROFESSIONAL EMPTY STATE */
        searchQuery || selectedFloor !== null || statusFilter || selectedType ? (
          <div className="bg-white rounded-[24px] border border-slate-200 p-10 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">No Matching Rooms Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                No rooms match your filter or search criteria.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedFloor(null);
                setStatusFilter('');
                setSelectedType('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <DoorOpen className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-navy-900">No Rooms Added Yet</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Start by adding your first hostel room. The system will automatically generate all beds and make them available for resident admissions and bookings.
              </p>
            </div>
            {isAdmin && (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setRoomFormData({
                    room_number: '',
                    floor: 1,
                    capacity: 2,
                    room_type: 'Double Sharing',
                    price: 0,
                    status: 'Available',
                    notes: '',
                  });
                  setIsAddModalOpen(true);
                }}
                className="mt-2"
              >
                Add New Room
              </Button>
            )}
          </div>
        )
      ) : (
        /* DYNAMIC ROOM GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isFull = room.occupied_count === room.capacity;
            const isPartiallyOccupied = room.occupied_count > 0 && !isFull;
            const isMaintenance = room.status === 'Maintenance' || room.status === 'Inactive';

            return (
              <Card
                key={room.id}
                padding="none"
                className={`overflow-hidden border transition-all duration-200 hover:shadow-md flex flex-col ${
                  isMaintenance
                    ? 'border-slate-300 opacity-90'
                    : isFull
                    ? 'border-rose-200'
                    : isPartiallyOccupied
                    ? 'border-amber-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Room Header */}
                <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div
                    onClick={() => setSelectedRoom(room)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to view all beds & occupants"
                  >
                    <span className="font-black text-base text-navy-900">Room {room.room_number}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      Fl {room.floor}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={room.status} />

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-0.5 ml-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(room)}
                          className="p-1 text-slate-400 hover:text-primary hover:bg-slate-200/60 rounded-lg transition-colors"
                          title="Edit Room"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoom(room);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Room Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                      <span className="truncate font-semibold">{room.room_type}</span>
                      <span className="font-bold text-navy-900 shrink-0">
                        {room.occupied_count}/{room.capacity} Occ
                      </span>
                    </div>

                    {room.price ? (
                      <div className="text-[11px] font-bold text-primary mb-2">
                        ₹{room.price.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ month</span>
                      </div>
                    ) : null}

                    {/* Bed Slots Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {room.beds.map((bed) => {
                        const isOccupied = bed.is_occupied || bed.status === 'Occupied';
                        const isBedMaintenance = bed.status === 'Maintenance';
                        const isReserved = bed.status === 'Reserved';

                        return (
                          <button
                            key={bed.id}
                            type="button"
                            onClick={() => setSelectedBed(bed)}
                            className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
                              isOccupied
                                ? 'bg-rose-50/70 border-rose-200 text-rose-950 hover:bg-rose-100/70'
                                : isBedMaintenance
                                ? 'bg-amber-50 border-amber-200 text-amber-950 hover:bg-amber-100'
                                : isReserved
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-950 hover:bg-indigo-100'
                                : 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold truncate">
                                {formatBedName(bed.bed_number)}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isOccupied
                                    ? 'bg-rose-500'
                                    : isBedMaintenance
                                    ? 'bg-amber-500'
                                    : isReserved
                                    ? 'bg-indigo-500'
                                    : 'bg-emerald-500'
                                }`}
                              />
                            </div>

                            {bed.current_guest_name ? (
                              <span className="text-[10px] font-bold text-rose-700 truncate block">
                                {bed.current_guest_name}
                              </span>
                            ) : bed.reserved_guest_name ? (
                              <span className="text-[10px] font-bold text-indigo-700 truncate block">
                                Booked: {bed.reserved_guest_name}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
                                {bed.status}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRoom(room)}
                    className="text-[11px] font-bold text-primary hover:text-primary-800 text-left pt-2 border-t border-slate-100 flex items-center justify-between"
                  >
                    <span>View Room Details</span>
                    <span>→</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ADD ROOM MODAL (ADMIN ONLY) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Room"
        subtitle="Create a room and automatically initialize its beds"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Room Number"
              placeholder="e.g. 101, 102, 201"
              value={roomFormData.room_number}
              onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
              required
            />
            <Input
              label="Floor Number"
              type="number"
              min={0}
              placeholder="e.g. 1, 2, 3"
              value={roomFormData.floor}
              onChange={(e) => setRoomFormData({ ...roomFormData, floor: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Room Type"
              value={roomFormData.room_type}
              onChange={(e) => setRoomFormData({ ...roomFormData, room_type: e.target.value })}
              options={[
                { value: 'Single', label: 'Single Room (1 Bed)' },
                { value: 'Double Sharing', label: 'Double Sharing (2 Beds)' },
                { value: 'Triple Sharing', label: 'Triple Sharing (3 Beds)' },
                { value: 'Dormitory', label: 'Dormitory (4+ Beds)' },
                { value: 'Standard Sharing', label: 'Standard Sharing' },
                { value: 'Deluxe Sharing', label: 'Deluxe Sharing' },
              ]}
              required
            />
            <Input
              label="Total Bed Capacity"
              type="number"
              min={1}
              max={50}
              placeholder="e.g. 2, 4, 6"
              value={roomFormData.capacity}
              onChange={(e) => setRoomFormData({ ...roomFormData, capacity: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Room / Bed Monthly Price (₹)"
              type="number"
              min={0}
              placeholder="e.g. 6500"
              value={roomFormData.price || ''}
              onChange={(e) => setRoomFormData({ ...roomFormData, price: parseFloat(e.target.value) || 0 })}
            />
            <Select
              label="Room Status"
              value={roomFormData.status}
              onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
              options={[
                { value: 'Available', label: 'Active & Available' },
                { value: 'Maintenance', label: 'Under Maintenance' },
                { value: 'Inactive', label: 'Inactive / Closed' },
              ]}
              required
            />
          </div>

          <Input
            label="Room Description / Notes (Optional)"
            placeholder="e.g. Attached washroom, balcony view, study table"
            value={roomFormData.notes || ''}
            onChange={(e) => setRoomFormData({ ...roomFormData, notes: e.target.value })}
          />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary shrink-0" />
            <span>
              Creating this room will automatically generate <strong>{roomFormData.capacity || 0} unique bed records</strong> in the database.
            </span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
              Save Room & Generate Beds
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT ROOM MODAL (ADMIN ONLY) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Room ${selectedRoom?.room_number}`}
        subtitle="Modify room properties and adjust bed capacities"
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateRoom} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Room Number"
              value={editFormData.room_number || ''}
              onChange={(e) => setEditFormData({ ...editFormData, room_number: e.target.value })}
              required
            />
            <Input
              label="Floor Number"
              type="number"
              min={0}
              value={editFormData.floor ?? 1}
              onChange={(e) => setEditFormData({ ...editFormData, floor: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Room Type"
              value={editFormData.room_type || 'Standard Sharing'}
              onChange={(e) => setEditFormData({ ...editFormData, room_type: e.target.value })}
              options={[
                { value: 'Single', label: 'Single Room (1 Bed)' },
                { value: 'Double Sharing', label: 'Double Sharing (2 Beds)' },
                { value: 'Triple Sharing', label: 'Triple Sharing (3 Beds)' },
                { value: 'Dormitory', label: 'Dormitory (4+ Beds)' },
                { value: 'Standard Sharing', label: 'Standard Sharing' },
                { value: 'Deluxe Sharing', label: 'Deluxe Sharing' },
              ]}
              required
            />
            <Input
              label="Total Bed Capacity"
              type="number"
              min={1}
              max={50}
              value={editFormData.capacity ?? 2}
              onChange={(e) => setEditFormData({ ...editFormData, capacity: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Room / Bed Monthly Price (₹)"
              type="number"
              min={0}
              value={editFormData.price || ''}
              onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
            />
            <Select
              label="Room Status"
              value={editFormData.status || 'Available'}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              options={[
                { value: 'Available', label: 'Active & Available' },
                { value: 'Full', label: 'Full (All Beds Occupied)' },
                { value: 'Maintenance', label: 'Under Maintenance' },
                { value: 'Inactive', label: 'Inactive / Closed' },
              ]}
              required
            />
          </div>

          <Input
            label="Room Description / Notes (Optional)"
            value={editFormData.notes || ''}
            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
          />

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
              Update Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE ROOM CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRoom}
        title="Delete Room Confirmation"
        message={`Are you sure you want to permanently delete Room ${selectedRoom?.room_number}? This will remove the room and its vacant beds. Note: Rooms with active residents or reservations cannot be deleted.`}
        confirmText="Delete Room"
        isDanger={true}
        isLoading={isSubmitting}
      />

      {/* FULL ROOM DETAIL MODAL */}
      <Modal
        isOpen={!!selectedRoom && !isEditModalOpen && !isDeleteModalOpen}
        onClose={() => setSelectedRoom(null)}
        title={`Room ${selectedRoom?.room_number} Details`}
        subtitle={`Floor ${selectedRoom?.floor} • ${selectedRoom?.room_type} • ${selectedRoom?.capacity} Beds Total`}
        maxWidth="lg"
      >
        {selectedRoom && (
          <div className="flex flex-col gap-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Capacity</span>
                <span className="text-base font-extrabold text-navy-900">{selectedRoom.capacity} Beds</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Occupied</span>
                <span className="text-base font-extrabold text-rose-600">{selectedRoom.occupied_count}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Vacant</span>
                <span className="text-base font-extrabold text-emerald-600">{selectedRoom.vacant_count}</span>
              </div>
            </div>

            {/* Beds List */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Beds Inside Room ({selectedRoom.beds.length})
                </span>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleAddBedToSelectedRoom}
                    isLoading={isSubmitting}
                  >
                    Add Bed
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto touch-scroll pr-1">
                {selectedRoom.beds.map((bed) => (
                  <div
                    key={bed.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          bed.is_occupied
                            ? 'bg-rose-100 text-rose-700'
                            : bed.status === 'Maintenance'
                            ? 'bg-amber-100 text-amber-700'
                            : bed.status === 'Reserved'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {bed.bed_number.split('-')[1] || bed.bed_number}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-navy-900 truncate">
                          {formatBedName(bed.bed_number)}
                        </div>
                        {bed.current_guest_name ? (
                          <div className="text-[11px] text-slate-600 font-medium truncate">
                            <span className="font-semibold text-rose-700">{bed.current_guest_name}</span>
                            {bed.current_guest_contact && ` • ${bed.current_guest_contact}`}
                            {bed.admission_date && ` (Since ${bed.admission_date})`}
                          </div>
                        ) : bed.reserved_guest_name ? (
                          <div className="text-[11px] text-indigo-700 font-semibold truncate">
                            Reserved: {bed.reserved_guest_name}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600 font-medium">
                            Available for admission / booking
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <StatusBadge status={bed.status} />
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBed(bed);
                          }}
                          className="text-xs px-2.5 py-1"
                        >
                          Manage
                        </Button>
                        {isAdmin && !bed.is_occupied && bed.status !== 'Reserved' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBedFromRoom(bed.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Bed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* SINGLE BED DETAILS & STATUS MODAL */}
      <Modal
        isOpen={!!selectedBed}
        onClose={() => setSelectedBed(null)}
        title={`${formatBedName(selectedBed?.bed_number || '')} Details`}
        subtitle="Manage bed status, inspect resident occupancy, or schedule maintenance"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Current Status:</span>
              <span className="font-bold text-navy-900">{selectedBed?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Occupancy:</span>
              <span className="font-bold text-navy-900">{selectedBed?.is_occupied ? 'Occupied' : 'Vacant'}</span>
            </div>
            {selectedBed?.current_guest_name && (
              <>
                <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                  <span className="text-slate-500 font-medium">Occupant:</span>
                  <span className="font-bold text-rose-700">{selectedBed.current_guest_name}</span>
                </div>
                {selectedBed.current_guest_contact && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Contact:</span>
                    <span className="font-semibold text-navy-900">{selectedBed.current_guest_contact}</span>
                  </div>
                )}
                {selectedBed.admission_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Admission Date:</span>
                    <span className="font-semibold text-navy-900">{selectedBed.admission_date}</span>
                  </div>
                )}
              </>
            )}
            {selectedBed?.reserved_guest_name && (
              <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                <span className="text-slate-500 font-medium">Booking:</span>
                <span className="font-bold text-indigo-700">Reserved ({selectedBed.reserved_guest_name})</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Change Status</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBedStatusChange('Available')}
                isLoading={isUpdatingBed}
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                Set Available
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBedStatusChange('Maintenance')}
                isLoading={isUpdatingBed}
                className="text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                Set Maintenance
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
