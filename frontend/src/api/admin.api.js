import { apiClient } from "./client";

export const adminApi = {
  getCommandCenter: async () => {
    const { data } = await apiClient.get("/admin/command-center");
    return data;
  },
  listUsers: async (params = {}) => {
    const { data } = await apiClient.get("/admin/users", { params });
    return data;
  },
  updateUserStatus: async (id, payload) => {
    const { data } = await apiClient.patch(`/admin/users/${id}/status`, payload);
    return data;
  },
  issueWarning: async (id, payload) => {
    const { data } = await apiClient.post(`/admin/users/${id}/warnings`, payload);
    return data;
  },
  suspendUser: async (id, payload) => {
    const { data } = await apiClient.post(`/admin/users/${id}/suspend`, payload);
    return data;
  },
  unsuspendUser: async (id, payload = {}) => {
    const { data } = await apiClient.post(`/admin/users/${id}/unsuspend`, payload);
    return data;
  },
  deactivateUser: async (id, payload) => {
    const { data } = await apiClient.post(`/admin/users/${id}/deactivate`, payload);
    return data;
  },
  reactivateUser: async (id, payload = {}) => {
    const { data } = await apiClient.post(`/admin/users/${id}/reactivate`, payload);
    return data;
  },
  removeUser: async (id, reason = "") => {
    const { data } = await apiClient.delete(`/admin/users/${id}`, {
      ...(reason ? { params: { reason } } : {}),
    });
    return data;
  },
  listModerationAudits: async (params = {}) => {
    const { data } = await apiClient.get("/admin/moderation/audits", { params });
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
  listEvents: async () => {
    const { data } = await apiClient.get("/admin/events");
    return data;
  },
  removeTeamMember: async (teamId, userId) => {
    const { data } = await apiClient.delete(`/admin/teams/${teamId}/members/${userId}`);
    return data;
  },
};
