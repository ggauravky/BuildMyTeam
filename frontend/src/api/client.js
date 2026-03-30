import axios from "axios";
import { clearAuthState, getStoredToken } from "../utils/storage";

const apiUrlFromEnv = import.meta.env.VITE_API_URL;
const isDevOrTest = import.meta.env.DEV || import.meta.env.MODE === "test";
const API_BASE_URL = apiUrlFromEnv || (isDevOrTest ? "http://localhost:5000/api" : "/api");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthState();
      globalThis.dispatchEvent(new Event("buildmyteam:unauthorized"));
    }

    return Promise.reject(error);
  }
);
