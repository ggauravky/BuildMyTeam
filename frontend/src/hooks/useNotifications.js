import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../api/notification.api";
import { useAuth } from "./useAuth";

export function useNotifications() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.list({ limit: 30 }),
    enabled: isAuthenticated,
    refetchInterval: 25000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: query.data?.notifications || [],
    isLoading: query.isLoading,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllMutation.mutateAsync,
  };
}
