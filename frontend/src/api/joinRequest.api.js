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
  listPendingForTeam: async (teamId) => {
    const { data } = await apiClient.get(`/join-requests/team/${teamId}`);
    return data;
  },
  review: async (joinRequestId, decision) => {
    const { data } = await apiClient.patch(`/join-requests/${joinRequestId}/review`, {
      decision,
    });
    return data;
  },
};
