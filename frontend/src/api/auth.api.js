import { apiClient } from "./client";

export const authApi = {
  signup: async (payload) => {
    const { data } = await apiClient.post("/auth/signup", payload);
    return data;
  },
  login: async (payload) => {
    const { data } = await apiClient.post("/auth/login", payload);
    return data;
  },
  me: async () => {
    const { data } = await apiClient.get("/auth/me");
    return data;
  },
};
