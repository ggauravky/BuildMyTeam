import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildStreamUrl } from "../api/client";
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
  const [realtimeStatus, setRealtimeStatus] = useState("polling");
  const refreshTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || typeof EventSource === "undefined") {
      return undefined;
    }

    const streamUrl = buildStreamUrl("/notifications/stream");
    const stream = new EventSource(streamUrl, { withCredentials: true });

    const queueRefresh = () => {
      if (refreshTimeoutRef.current) {
        return;
      }

      refreshTimeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        refreshTimeoutRef.current = null;
      }, 250);
    };

    stream.onopen = () => {
      setRealtimeStatus("live");
    };

    stream.addEventListener("connected", () => {
      setRealtimeStatus("live");
    });

    stream.addEventListener("notification", queueRefresh);

    stream.onerror = () => {
      setRealtimeStatus("polling");
    };

    return () => {
      stream.close();

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      setRealtimeStatus("polling");
    };
  }, [isAuthenticated, queryClient]);

  const query = useQuery({
    queryKey: ["notifications", priorityParam],
    queryFn: () =>
      notificationApi.list({
        limit: 30,
        ...(priorityParam ? { priorities: priorityParam } : {}),
      }),
    enabled: isAuthenticated,
    refetchInterval: realtimeStatus === "live" ? false : 25000,
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
    realtimeStatus,
    updatePreferences: updatePreferencesMutation.mutateAsync,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
  };
}
