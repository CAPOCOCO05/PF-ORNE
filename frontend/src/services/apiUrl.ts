// URL de la API de ORNE (backend/), sin la diagonal final. Se lee de EXPO_PUBLIC_API_URL
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
