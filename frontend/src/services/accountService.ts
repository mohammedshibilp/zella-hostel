import api from './api';
import { AccountTransaction, AccountSummary } from '../types';

export const accountService = {
  async getTransactions(params?: {
    transaction_type?: string;
    entry_type?: string;
    payment_channel?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AccountTransaction[]> {
    const response = await api.get('/accounts', { params });
    return response.data;
  },

  async getSummary(): Promise<AccountSummary> {
    const response = await api.get('/accounts/summary');
    return response.data;
  },

  async createTransaction(data: any): Promise<AccountTransaction> {
    const response = await api.post('/accounts', data);
    return response.data;
  },
};
