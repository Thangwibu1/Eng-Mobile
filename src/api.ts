import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${defaultHost}:4000/api`;

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(r => r, error => {
  error.userMessage = error.response?.data?.error?.message || error.message || 'Something went wrong';
  return Promise.reject(error);
});

export const unwrap = <T,>(response: any): T => response.data.data as T;
export const auth = {
  async login(identifier: string, password: string) {
    const data = unwrap<any>(await api.post('/auth/login', { identifier, password }));
    await AsyncStorage.setItem('accessToken', data.accessToken);
    return data.user;
  },
  async register(username: string, email: string, password: string, confirmPassword: string) {
    const data = unwrap<any>(await api.post('/auth/register', { username, email, password, confirmPassword }));
    await AsyncStorage.setItem('accessToken', data.accessToken);
    return data.user;
  },
  async me() {
    if (!await AsyncStorage.getItem('accessToken')) return null;
    return unwrap<any>(await api.get('/me'));
  },
  async logout() { await AsyncStorage.removeItem('accessToken'); },
};
