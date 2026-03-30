import { apiClient } from "./client";

export const eventApi = {
  list: async () => {
    const { data } = await apiClient.get("/events");
    return data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post("/events", payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await apiClient.patch(`/events/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/events/${id}`);
    return data;
  },
};
