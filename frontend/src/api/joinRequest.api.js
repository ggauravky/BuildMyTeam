import { apiClient } from "./client";

export const joinRequestApi = {
  createByCode: async (code) => {
    const { data } = await apiClient.post("/join-requests/by-code", { code });
    return data;
  },
  listMine: async () => {
    const { data } = await apiClient.get("/join-requests/my");
    return data;
  },
  cancel: async (joinRequestId) => {
    const { data } = await apiClient.patch(`/join-requests/${joinRequestId}/cancel`);
    return data;
  },
  listPendingForTeam: async (teamId) => {
    const { data } = await apiClient.get(`/join-requests/team/${teamId}`);
    return data;
  },
  listRankedForTeam: async (teamId, params = {}) => {
    const { data } = await apiClient.get(`/join-requests/team/${teamId}/ranked`, { params });
    return data;
  },
  review: async (joinRequestId, decisionOrPayload, extraPayload = {}) => {
    const payload =
      typeof decisionOrPayload === "string"
        ? { decision: decisionOrPayload, ...extraPayload }
        : decisionOrPayload;

    const { data } = await apiClient.patch(`/join-requests/${joinRequestId}/review`, {
      ...payload,
    });
    return data;
  },
};
