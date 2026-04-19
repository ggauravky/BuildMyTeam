import axios from "axios";
import { clearAuthState, getStoredToken } from "../utils/storage";

const apiUrlFromEnv = import.meta.env.VITE_API_URL;
const isDevOrTest = import.meta.env.DEV || import.meta.env.MODE === "test";
const API_BASE_URL = apiUrlFromEnv || (isDevOrTest ? "http://localhost:5000/api" : "/api");
const NORMALIZED_API_BASE_URL = API_BASE_URL.endsWith("/")
  ? API_BASE_URL.slice(0, -1)
  : API_BASE_URL;

export const resolveApiUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${NORMALIZED_API_BASE_URL}${normalizedPath}`;
};

export const buildStreamUrl = (path, { includeAccessToken = true } = {}) => {
  const baseUrl = resolveApiUrl(path);

  if (!includeAccessToken) {
    return baseUrl;
  }

  const token = getStoredToken();

  if (!token) {
    return baseUrl;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}accessToken=${encodeURIComponent(token)}`;
};

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
