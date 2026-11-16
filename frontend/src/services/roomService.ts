import api from './api';
import { Room, Bed, RoomCreatePayload, RoomUpdatePayload } from '../types';

export const roomService = {
  async getRooms(
    floor?: number,
    status_filter?: string,
    room_type?: string,
    search?: string
  ): Promise<Room[]> {
    const params: any = {};
    if (floor !== undefined && floor !== null) params.floor = floor;
    if (status_filter) params.status_filter = status_filter;
    if (room_type) params.room_type = room_type;
    if (search) params.search = search;
    const response = await api.get('/rooms', { params });
    return response.data;
  },

  async getAvailableRooms(): Promise<Room[]> {
    const response = await api.get('/rooms/available');
    return response.data;
  },

  async getAvailableBeds(roomId: number): Promise<Bed[]> {
    const response = await api.get(`/rooms/${roomId}/beds/available`);
    return response.data;
  },

  async getRoomChart() {
    const response = await api.get('/rooms/chart');
    return response.data;
  },

  async getRoom(id: number): Promise<Room> {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  async createRoom(data: RoomCreatePayload): Promise<Room> {
    const response = await api.post('/rooms', data);
    return response.data;
  },

  async updateRoom(id: number, data: RoomUpdatePayload): Promise<Room> {
    const response = await api.put(`/rooms/${id}`, data);
    return response.data;
  },

  async deleteRoom(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },

  async addBed(roomId: number, bed_number?: string, notes?: string): Promise<Bed> {
    const response = await api.post(`/rooms/${roomId}/beds`, { bed_number, notes });
    return response.data;
  },

  async deleteBed(roomId: number, bedId: number): Promise<{ message: string }> {
    const response = await api.delete(`/rooms/${roomId}/beds/${bedId}`);
    return response.data;
  },

  async updateBedStatus(bedId: number, status: string): Promise<Bed> {
    const response = await api.patch(`/rooms/beds/${bedId}/status`, null, {
      params: { status },
    });
    return response.data;
  },
};
