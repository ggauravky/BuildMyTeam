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
  getWorkspace: async (id) => {
    const { data } = await apiClient.get(`/teams/${id}/workspace`);
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
  getHealth: async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/health`);
    return data;
  },
  updateHealth: async (teamId, payload) => {
    const { data } = await apiClient.patch(`/teams/${teamId}/health`, payload);
    return data;
  },
  getActionCenter: async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/action-center`);
    return data;
  },
  getPerformanceIntelligence: async (teamId, params = {}) => {
    const { data } = await apiClient.get(`/teams/${teamId}/performance-intelligence`, { params });
    return data;
  },
  listTasks: async (teamId, params = {}) => {
    const { data } = await apiClient.get(`/teams/${teamId}/tasks`, { params });
    return data;
  },
  createTask: async (teamId, payload) => {
    const { data } = await apiClient.post(`/teams/${teamId}/tasks`, payload);
    return data;
  },
  updateTask: async (teamId, taskId, payload) => {
    const { data } = await apiClient.patch(`/teams/${teamId}/tasks/${taskId}`, payload);
    return data;
  },
  getCapacity: async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/capacity`);
    return data;
  },
  updateCapacity: async (teamId, memberId, payload) => {
    const { data } = await apiClient.patch(`/teams/${teamId}/capacity/${memberId}`, payload);
    return data;
  },
  listOnboardingPack: async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/onboarding-pack`);
    return data;
  },
  initOnboardingPack: async (teamId, memberId) => {
    const { data } = await apiClient.post(`/teams/${teamId}/onboarding-pack/${memberId}/init`);
    return data;
  },
  updateOnboardingPack: async (teamId, recordId, payload) => {
    const { data } = await apiClient.patch(`/teams/${teamId}/onboarding-pack/${recordId}`, payload);
    return data;
  },
  listDecisionLog: async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/decision-log`);
    return data;
  },
  createDecisionLog: async (teamId, payload) => {
    const { data } = await apiClient.post(`/teams/${teamId}/decision-log`, payload);
    return data;
  },
  updateDecisionLog: async (teamId, decisionId, payload) => {
    const { data } = await apiClient.patch(`/teams/${teamId}/decision-log/${decisionId}`, payload);
    return data;
  },
  listOwnershipLedger: async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/ownership-ledger`);
    return data;
  },
  createOwnershipEntry: async (teamId, payload) => {
    const { data } = await apiClient.post(`/teams/${teamId}/ownership-ledger`, payload);
    return data;
  },
  updateOwnershipEntry: async (teamId, entryId, payload) => {
    const { data } = await apiClient.patch(`/teams/${teamId}/ownership-ledger/${entryId}`, payload);
    return data;
  },
};
