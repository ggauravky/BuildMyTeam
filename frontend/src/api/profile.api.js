import { apiClient } from "./client";

export const profileApi = {
  getMine: async () => {
    const { data } = await apiClient.get("/profile/me");
    return data;
  },
  updateMine: async (payload) => {
    const { data } = await apiClient.patch("/profile/me", payload);
    return data;
  },
  getPublicByUsername: async (username) => {
    const { data } = await apiClient.get(`/profile/${username}`);
    return data;
  },
};
