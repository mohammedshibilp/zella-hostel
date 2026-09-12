import api from './api';
import { Room } from '../types';

export const roomService = {
  async getRooms(floor?: number, status_filter?: string): Promise<Room[]> {
    const params: any = {};
    if (floor) params.floor = floor;
    if (status_filter) params.status_filter = status_filter;
    const response = await api.get('/rooms', { params });
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

  async updateBedStatus(bedId: number, status: string) {
    const response = await api.patch(`/rooms/beds/${bedId}/status`, null, {
      params: { status },
    });
    return response.data;
  },
};
