import { apiClient } from "./client";

export const teamApi = {
  list: async (params = {}) => {
    const { data } = await apiClient.get("/teams", { params });
    return data;
  },
  listMine: async () => {
    const { data } = await apiClient.get("/teams/mine");
    return data;
  },
  getById: async (id) => {
    const { data } = await apiClient.get(`/teams/${id}`);
    return data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post("/teams", payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await apiClient.patch(`/teams/${id}`, payload);
    return data;
  },
  removeMember: async (teamId, userId) => {
    const { data } = await apiClient.delete(`/teams/${teamId}/members/${userId}`);
    return data;
  },
  transferLeader: async (teamId, newLeaderId) => {
    const { data } = await apiClient.patch(`/teams/${teamId}/transfer-leader`, { newLeaderId });
    return data;
  },
  removeTeam: async (teamId) => {
    const { data } = await apiClient.delete(`/teams/${teamId}`);
    return data;
  },
  getQr: async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/qr`);
    return data;
  },
};
