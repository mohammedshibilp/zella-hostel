import api from './api';
import { Admission } from '../types';

export const admissionService = {
  async getAdmissions(params?: { status_filter?: string; guest_id?: number; room_id?: number }): Promise<Admission[]> {
    const response = await api.get('/admissions', { params });
    return response.data;
  },

  async createAdmission(admissionData: any): Promise<Admission> {
    const response = await api.post('/admissions', admissionData);
    return response.data;
  },

  async checkout(admissionId: number, checkoutDate: string, notes?: string): Promise<Admission> {
    const response = await api.post(`/admissions/${admissionId}/checkout`, {
      checkout_date: checkoutDate,
      notes,
    });
    return response.data;
  },
};
