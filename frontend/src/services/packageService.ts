import api from './api';
import { Package } from '../types';

export const packageService = {
  async getPackages(activeOnly: boolean = true): Promise<Package[]> {
    const response = await api.get('/packages', {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  async createPackage(data: any): Promise<Package> {
    const response = await api.post('/packages', data);
    return response.data;
  },

  async updatePackage(id: number, data: any): Promise<Package> {
    const response = await api.put(`/packages/${id}`, data);
    return response.data;
  },
};
