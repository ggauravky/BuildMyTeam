import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../api/notification.api";
import { useAuth } from "./useAuth";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  inAppEnabled: true,
  enabledPriorities: ["low", "medium", "high", "critical"],
  mutedTypes: [],
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
    timezone: "UTC",
  },
};

const normalizePriorities = (priorities = []) =>
  Array.from(
    new Set(
      (priorities || [])
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter(Boolean)
    )
  )
    .sort()
    .join(",");

export function useNotifications({ priorities = [] } = {}) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const priorityParam = normalizePriorities(priorities);

  const query = useQuery({
    queryKey: ["notifications", priorityParam],
    queryFn: () =>
      notificationApi.list({
        limit: 30,
        ...(priorityParam ? { priorities: priorityParam } : {}),
      }),
    enabled: isAuthenticated,
    refetchInterval: 25000,
  });

  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => notificationApi.getPreferences(),
    enabled: isAuthenticated,
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

  const updatePreferencesMutation = useMutation({
    mutationFn: (payload) => notificationApi.updatePreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: query.data?.notifications || [],
    summary: query.data?.summary || {
      unreadCount: 0,
      countsByPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    },
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage:
      query.error?.response?.data?.message ||
      query.error?.message ||
      "Unable to load notifications right now.",
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllMutation.mutateAsync,
    isUpdating: markReadMutation.isPending || markAllMutation.isPending,
    preferences: preferencesQuery.data?.preferences || DEFAULT_NOTIFICATION_PREFERENCES,
    isPreferencesLoading: preferencesQuery.isLoading,
    preferencesError:
      preferencesQuery.error?.response?.data?.message ||
      preferencesQuery.error?.message ||
      "Unable to load notification preferences right now.",
    updatePreferences: updatePreferencesMutation.mutateAsync,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
  };
}
