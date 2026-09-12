import api from './api';
import { FeeReceipt } from '../types';

export const feeReceiptService = {
  async getReceipts(params?: { guest_id?: number; payment_mode?: string }): Promise<FeeReceipt[]> {
    const response = await api.get('/fee-receipts', { params });
    return response.data;
  },

  async getReceipt(id: number): Promise<FeeReceipt> {
    const response = await api.get(`/fee-receipts/${id}`);
    return response.data;
  },

  async createReceipt(receiptData: any): Promise<FeeReceipt> {
    const response = await api.post('/fee-receipts', receiptData);
    return response.data;
  },
};
