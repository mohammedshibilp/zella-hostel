import api from './api';
import { Guest } from '../types';

export const guestService = {
  async getGuests(params?: { status_filter?: string; search?: string }): Promise<Guest[]> {
    const response = await api.get('/guests', { params });
    return response.data;
  },

  async getGuest(id: number): Promise<Guest> {
    const response = await api.get(`/guests/${id}`);
    return response.data;
  },

  async createGuest(guestData: any): Promise<Guest> {
    const response = await api.post('/guests', guestData);
    return response.data;
  },

  async updateGuest(id: number, guestData: any): Promise<Guest> {
    const response = await api.put(`/guests/${id}`, guestData);
    return response.data;
  },
};
