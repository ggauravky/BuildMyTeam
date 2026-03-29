import { apiClient } from "./client";

export const profileApi = {
  getMine: async () => {
    const { data } = await apiClient.get("/profile/me");
    return data;
  },
};
