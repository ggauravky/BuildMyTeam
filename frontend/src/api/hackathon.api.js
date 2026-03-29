import { apiClient } from "./client";

export const hackathonApi = {
  list: async () => {
    const { data } = await apiClient.get("/hackathons");
    return data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post("/hackathons", payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await apiClient.patch(`/hackathons/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/hackathons/${id}`);
    return data;
  },
};
