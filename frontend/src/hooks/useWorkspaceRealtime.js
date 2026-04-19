import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { buildStreamUrl } from "../api/client";

const eventTypeToQueryKeys = (teamId, eventType) => {
  const keys = [["team", teamId], ["team-action-center", teamId]];

  if (eventType.startsWith("task_")) {
    keys.push(
      ["team-task-board", teamId],
      ["team-capacity", teamId],
      ["team-performance-intelligence", teamId]
    );
  }

  if (eventType.startsWith("capacity_")) {
    keys.push(["team-capacity", teamId], ["team-performance-intelligence", teamId]);
  }

  if (eventType.startsWith("onboarding_")) {
    keys.push(["team-onboarding-pack", teamId]);
  }

  if (eventType.startsWith("decision_")) {
    keys.push(["team-decision-log", teamId]);
  }

  if (eventType.startsWith("ownership_")) {
    keys.push(["team-ownership-ledger", teamId]);
  }

  if (eventType.startsWith("join_request_")) {
    keys.push(
      ["team-pending-requests", teamId],
      ["team-onboarding-pack", teamId],
      ["team-smart-matching", teamId],
      ["team-performance-intelligence", teamId],
      ["notifications"]
    );
  }

  return keys;
};

const parseEventData = (event) => {
  if (!event?.data) {
    return null;
  }

  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
};

export function useWorkspaceRealtime({ teamId, enabled = true } = {}) {
  const queryClient = useQueryClient();
  const [realtimeStatus, setRealtimeStatus] = useState("polling");
  const [onlineMemberIds, setOnlineMemberIds] = useState([]);
  const queuedKeyMapRef = useRef(new Map());
  const flushTimeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled || !teamId || typeof EventSource === "undefined") {
      return undefined;
    }

    const streamUrl = buildStreamUrl(`/teams/${teamId}/workspace/stream`);
    const stream = new EventSource(streamUrl, { withCredentials: true });
    const queuedKeyMap = queuedKeyMapRef.current;

    stream.onopen = () => {
      setRealtimeStatus("live");
    };

    const queueQueryRefresh = (queryKeys) => {
      queryKeys.forEach((queryKey) => {
        queuedKeyMap.set(JSON.stringify(queryKey), queryKey);
      });

      if (flushTimeoutRef.current) {
        return;
      }

      flushTimeoutRef.current = setTimeout(() => {
        const queryKeysToRefresh = Array.from(queuedKeyMap.values());
        queuedKeyMap.clear();
        flushTimeoutRef.current = null;

        queryKeysToRefresh.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }, 250);
    };

    const onPresence = (event) => {
      const payload = parseEventData(event);

      if (!payload) {
        return;
      }

      setOnlineMemberIds(Array.isArray(payload.onlineMemberIds) ? payload.onlineMemberIds : []);
    };

    const onWorkspaceEvent = (event) => {
      const payload = parseEventData(event);

      if (!payload?.type) {
        return;
      }

      queueQueryRefresh(eventTypeToQueryKeys(teamId, payload.type));
    };

    stream.addEventListener("connected", () => {
      setRealtimeStatus("live");
    });

    stream.addEventListener("presence", onPresence);
    stream.addEventListener("workspace_event", onWorkspaceEvent);

    stream.onerror = () => {
      setRealtimeStatus("polling");
    };

    return () => {
      stream.close();

      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }

      queuedKeyMap.clear();
      setRealtimeStatus("polling");
      setOnlineMemberIds([]);
    };
  }, [enabled, queryClient, teamId]);

  return {
    realtimeStatus,
    isRealtimeConnected: realtimeStatus === "live",
    onlineMemberIds,
    onlineCount: onlineMemberIds.length,
  };
}
