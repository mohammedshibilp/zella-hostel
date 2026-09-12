import api from './api';
import { Enquiry } from '../types';

export const enquiryService = {
  async getEnquiries(params?: { mode?: string; current_status?: string; search?: string }): Promise<Enquiry[]> {
    const response = await api.get('/enquiries', { params });
    return response.data;
  },

  async createEnquiry(enquiryData: any): Promise<Enquiry> {
    const response = await api.post('/enquiries', enquiryData);
    return response.data;
  },

  async updateEnquiry(id: number, enquiryData: any): Promise<Enquiry> {
    const response = await api.put(`/enquiries/${id}`, enquiryData);
    return response.data;
  },

  async updateStatus(id: number, status: string): Promise<Enquiry> {
    const response = await api.patch(`/enquiries/${id}/status`, null, {
      params: { current_status: status },
    });
    return response.data;
  },

  async deleteEnquiry(id: number): Promise<void> {
    await api.delete(`/enquiries/${id}`);
  },
};
