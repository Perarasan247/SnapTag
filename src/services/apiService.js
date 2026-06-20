import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE = Platform.OS === 'web'
  ? (process.env.EXPO_PUBLIC_API_URL_WEB || 'http://localhost:3001')
  : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001');
const SESSION_KEY = '@snaptag_session';
const TIMEOUT_MS = 30000;

const getToken = async () => {
  try {
    const str = await AsyncStorage.getItem(SESSION_KEY);
    return str ? JSON.parse(str).token : null;
  } catch { return null; }
};

export const api = async (method, path, body) => {
  const token = await getToken();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Request failed');
    return data;
  } catch (err) {
    const isAbort = err.name === 'AbortError' || err.message === 'Fetch request has been canceled';
    if (isAbort) {
      if (timedOut) {
        throw new Error('Server unreachable — check that the Python server is running and the API URL is correct');
      }
      // Browser/navigation canceled the request — not a real error, return null silently
      return null;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};
