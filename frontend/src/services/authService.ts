import api from './api';
import { User } from '../types';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async changePassword(old_password: string, new_password: string) {
    const response = await api.post('/auth/change-password', { old_password, new_password });
    return response.data;
  },

  async listUsers(): Promise<User[]> {
    const response = await api.get('/auth/users');
    return response.data;
  },

  async createUser(userData: any): Promise<User> {
    const response = await api.post('/auth/users', userData);
    return response.data;
  },
};
