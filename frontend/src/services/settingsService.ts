import api from './api';

export const settingsService = {
  async getMaintenanceRecords(status_filter?: string) {
    const params = status_filter ? { status_filter } : {};
    const response = await api.get('/settings/maintenance', { params });
    return response.data;
  },

  async createMaintenanceRecord(data: any) {
    const response = await api.post('/settings/maintenance', data);
    return response.data;
  },

  async updateMaintenanceStatus(id: number, status: string) {
    const response = await api.patch(`/settings/maintenance/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  async getHostelSettings() {
    const response = await api.get('/settings/general');
    return response.data;
  },

  async updateHostelSetting(key: string, value: string) {
    const response = await api.put(`/settings/general/${key}`, null, {
      params: { value },
    });
    return response.data;
  },

  async getOccupancyReport() {
    const response = await api.get('/reports/occupancy');
    return response.data;
  },

  async getFinancialReport(months: number = 6) {
    const response = await api.get('/reports/financial', {
      params: { months },
    });
    return response.data;
  },
};
