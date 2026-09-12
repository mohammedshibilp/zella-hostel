import api from './api';
import { Booking } from '../types';

export const bookingService = {
  async getBookings(status_filter?: string): Promise<Booking[]> {
    const params = status_filter ? { status_filter } : {};
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  async createBooking(bookingData: any): Promise<Booking> {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  async cancelBooking(id: number): Promise<Booking> {
    const response = await api.patch(`/bookings/${id}/cancel`);
    return response.data;
  },

  async checkInBooking(id: number): Promise<Booking> {
    const response = await api.post(`/bookings/${id}/check-in`);
    return response.data;
  },
};
