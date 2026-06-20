import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SESSION_KEY = '@snaptag_session';

const API_URL = Platform.OS === 'web'
  ? (process.env.EXPO_PUBLIC_API_URL_WEB || 'http://localhost:3001')
  : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001');

const apiPost = async (path, body) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Request failed');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Cannot reach server — check that the Python server is running');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const login = async (email, password) => {
  if (!email.trim() || !password.trim()) {
    throw new Error('Email and password are required');
  }

  const data = await apiPost('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });

  const session = {
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    token: data.token,
    loginAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const register = async (email, password, name) => {
  if (!email.trim() || !password.trim()) {
    throw new Error('Email and password are required');
  }

  const data = await apiPost('/auth/register', {
    email: email.trim().toLowerCase(),
    password,
    name: name?.trim() || undefined,
  });

  const session = {
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    token: data.token,
    loginAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const logout = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};

export const getSession = async () => {
  try {
    const str = await AsyncStorage.getItem(SESSION_KEY);
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
};
