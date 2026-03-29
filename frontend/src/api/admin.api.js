import { apiClient } from "./client";

export const adminApi = {
  listUsers: async (params = {}) => {
    const { data } = await apiClient.get("/admin/users", { params });
    return data;
  },
  updateUserStatus: async (id, payload) => {
    const { data } = await apiClient.patch(`/admin/users/${id}/status`, payload);
    return data;
  },
  listTeams: async () => {
    const { data } = await apiClient.get("/admin/teams");
    return data;
  },
  listHackathons: async () => {
    const { data } = await apiClient.get("/admin/hackathons");
    return data;
  },
};
