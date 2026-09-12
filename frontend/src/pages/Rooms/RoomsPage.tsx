import React, { useEffect, useState } from 'react';
import { roomService } from '../../services/roomService';
import { Room, Bed } from '../../types';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import {
  DoorOpen,
  BedDouble,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Filter,
} from 'lucide-react';

export const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [chartSummary, setChartSummary] = useState<any>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [isUpdatingBed, setIsUpdatingBed] = useState<boolean>(false);

  const { success, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [roomsData, chartData] = await Promise.all([
        roomService.getRooms(selectedFloor || undefined, statusFilter || undefined),
        roomService.getRoomChart(),
      ]);
      setRooms(roomsData);
      setChartSummary(chartData);
    } catch (err) {
      toastError('Failed to load hostel room data', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFloor, statusFilter]);

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

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="23-Room Chart & Bed Matrix"
        subtitle="Visual grid of all 23 initial hostel rooms across 3 floors (101–110, 201–210, 301–303)"
      />

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Total Rooms</div>
            <div className="text-xl font-extrabold text-navy-900">{chartSummary?.total_rooms || 23}</div>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Total Beds</div>
            <div className="text-xl font-extrabold text-navy-900">{chartSummary?.total_beds || 49}</div>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Occupied Beds</div>
            <div className="text-xl font-extrabold text-rose-600">{chartSummary?.occupied_beds || 0}</div>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Vacant Beds</div>
            <div className="text-xl font-extrabold text-emerald-600">{chartSummary?.vacant_beds || 49}</div>
          </div>
        </Card>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        {/* Floor Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedFloor(null)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selectedFloor === null
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Floors (23)
          </button>
          <button
            onClick={() => setSelectedFloor(1)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selectedFloor === 1
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Floor 1 (101–110)
          </button>
          <button
            onClick={() => setSelectedFloor(2)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selectedFloor === 2
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Floor 2 (201–210)
          </button>
          <button
            onClick={() => setSelectedFloor(3)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selectedFloor === 3
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Floor 3 (301–303)
          </button>
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Full">Full</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* 23-ROOM VISUAL GRID */}
      {isLoading ? (
        <LoadingState message="Loading room matrix..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isFull = room.occupied_count === room.capacity;
            const isPartiallyOccupied = room.occupied_count > 0 && !isFull;

            return (
              <Card
                key={room.id}
                padding="none"
                className={`overflow-hidden border transition-all ${
                  isFull ? 'border-rose-200' : isPartiallyOccupied ? 'border-amber-200' : 'border-slate-200'
                }`}
              >
                {/* Room Header */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-navy-900">Room {room.room_number}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Fl {room.floor}</span>
                  </div>
                  <StatusBadge status={room.status} />
                </div>

                {/* Bed Slots */}
                <div className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>{room.room_type}</span>
                    <span>
                      {room.occupied_count} / {room.capacity} occupied
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {room.beds.map((bed) => {
                      const isOccupied = bed.is_occupied || bed.status === 'Occupied';
                      const isMaintenance = bed.status === 'Maintenance';

                      return (
                        <button
                          key={bed.id}
                          type="button"
                          onClick={() => setSelectedBed(bed)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                            isOccupied
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950 hover:bg-rose-100/70'
                              : isMaintenance
                              ? 'bg-amber-50 border-amber-200 text-amber-950 hover:bg-amber-100'
                              : 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{bed.bed_number}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOccupied ? 'bg-rose-500' : isMaintenance ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                            {bed.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* BED DETAILS & STATUS MODAL */}
      <Modal
        isOpen={!!selectedBed}
        onClose={() => setSelectedBed(null)}
        title={`Bed ${selectedBed?.bed_number} Details`}
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Status:</span>
              <span className="font-bold text-navy-900">{selectedBed?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Occupancy:</span>
              <span className="font-bold text-navy-900">{selectedBed?.is_occupied ? 'Occupied' : 'Vacant'}</span>
            </div>
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
                Maintenance
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
