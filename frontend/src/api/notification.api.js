import { apiClient } from "./client";

export const notificationApi = {
  list: async (params = {}) => {
    const { data } = await apiClient.get("/notifications", { params });
    return data;
  },
  markRead: async (id) => {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data;
  },
  markAllRead: async () => {
    const { data } = await apiClient.patch("/notifications/read-all");
    return data;
  },
};
