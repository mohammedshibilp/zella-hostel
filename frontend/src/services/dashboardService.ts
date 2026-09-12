import api from './api';
import { DashboardMetrics } from '../types';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    const response = await api.get('/dashboard/metrics');
    return response.data;
  },
};
