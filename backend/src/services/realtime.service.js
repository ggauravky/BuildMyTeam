const HEARTBEAT_INTERVAL_MS = 25000;

const notificationSubscribersByUser = new Map();
const workspaceSubscribersByTeam = new Map();
const teamPresenceByUser = new Map();

const normalizeId = (value) => String(value || "").trim();

const writeSseEvent = (res, eventName, payload) => {
  if (!res || res.writableEnded || res.destroyed) {
    return false;
  }

  try {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    return true;
  } catch {
    return false;
  }
};

const initializeSseResponse = (res) => {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  if (res.socket) {
    res.socket.setNoDelay(true);
    res.socket.setKeepAlive(true);
    res.socket.setTimeout(0);
  }

  const heartbeat = globalThis.setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      globalThis.clearInterval(heartbeat);
      return;
    }

    res.write(": keepalive\n\n");
  }, HEARTBEAT_INTERVAL_MS);

  return () => {
    globalThis.clearInterval(heartbeat);
  };
};

const getOrCreateSet = (map, key) => {
  if (!map.has(key)) {
    map.set(key, new Set());
  }

  return map.get(key);
};

const emitToNotificationSubscribers = (userId, eventName, payload) => {
  const normalizedUserId = normalizeId(userId);
  const subscribers = notificationSubscribersByUser.get(normalizedUserId);

  if (!subscribers || subscribers.size === 0) {
    return;
  }

  Array.from(subscribers).forEach((res) => {
    const sent = writeSseEvent(res, eventName, payload);

    if (!sent) {
      subscribers.delete(res);
    }
  });

  if (subscribers.size === 0) {
    notificationSubscribersByUser.delete(normalizedUserId);
  }
};

const buildPresenceSnapshot = (teamId) => {
  const normalizedTeamId = normalizeId(teamId);
  const presenceMap = teamPresenceByUser.get(normalizedTeamId) || new Map();
  const onlineMemberIds = Array.from(presenceMap.entries())
    .filter(([, connectionCount]) => connectionCount > 0)
    .map(([userId]) => userId);

  return {
    teamId: normalizedTeamId,
    onlineMemberIds,
    onlineCount: onlineMemberIds.length,
    timestamp: new Date().toISOString(),
  };
};

const emitToWorkspaceSubscribers = (teamId, eventName, payload) => {
  const normalizedTeamId = normalizeId(teamId);
  const subscribers = workspaceSubscribersByTeam.get(normalizedTeamId);

  if (!subscribers || subscribers.size === 0) {
    return;
  }

  Array.from(subscribers).forEach((subscriber) => {
    const sent = writeSseEvent(subscriber.res, eventName, payload);

    if (!sent) {
      subscribers.delete(subscriber);
    }
  });

  if (subscribers.size === 0) {
    workspaceSubscribersByTeam.delete(normalizedTeamId);
  }
};

const emitWorkspacePresence = (teamId) => {
  emitToWorkspaceSubscribers(teamId, "presence", buildPresenceSnapshot(teamId));
};

const registerNotificationStream = ({ userId, res }) => {
  const normalizedUserId = normalizeId(userId);
  const stopHeartbeat = initializeSseResponse(res);
  const subscribers = getOrCreateSet(notificationSubscribersByUser, normalizedUserId);

  subscribers.add(res);

  writeSseEvent(res, "connected", {
    channel: "notifications",
    timestamp: new Date().toISOString(),
  });

  return () => {
    stopHeartbeat();

    const currentSubscribers = notificationSubscribersByUser.get(normalizedUserId);

    if (!currentSubscribers) {
      return;
    }

    currentSubscribers.delete(res);

    if (currentSubscribers.size === 0) {
      notificationSubscribersByUser.delete(normalizedUserId);
    }
  };
};

const publishNotificationEvent = ({ userId, notification }) => {
  if (!notification) {
    return;
  }

  emitToNotificationSubscribers(userId, "notification", {
    notification,
    timestamp: new Date().toISOString(),
  });
};

const registerTeamWorkspaceStream = ({ teamId, userId, res }) => {
  const normalizedTeamId = normalizeId(teamId);
  const normalizedUserId = normalizeId(userId);
  const stopHeartbeat = initializeSseResponse(res);

  const subscribers = getOrCreateSet(workspaceSubscribersByTeam, normalizedTeamId);
  const subscriberRecord = { res, userId: normalizedUserId };
  subscribers.add(subscriberRecord);

  const teamPresence = teamPresenceByUser.get(normalizedTeamId) || new Map();
  teamPresence.set(normalizedUserId, (teamPresence.get(normalizedUserId) || 0) + 1);
  teamPresenceByUser.set(normalizedTeamId, teamPresence);

  writeSseEvent(res, "connected", {
    channel: "workspace",
    teamId: normalizedTeamId,
    timestamp: new Date().toISOString(),
  });

  emitWorkspacePresence(normalizedTeamId);

  return () => {
    stopHeartbeat();

    const currentSubscribers = workspaceSubscribersByTeam.get(normalizedTeamId);

    if (currentSubscribers) {
      currentSubscribers.delete(subscriberRecord);

      if (currentSubscribers.size === 0) {
        workspaceSubscribersByTeam.delete(normalizedTeamId);
      }
    }

    const teamPresenceSnapshot = teamPresenceByUser.get(normalizedTeamId);

    if (teamPresenceSnapshot) {
      const nextCount = (teamPresenceSnapshot.get(normalizedUserId) || 1) - 1;

      if (nextCount > 0) {
        teamPresenceSnapshot.set(normalizedUserId, nextCount);
      } else {
        teamPresenceSnapshot.delete(normalizedUserId);
      }

      if (teamPresenceSnapshot.size === 0) {
        teamPresenceByUser.delete(normalizedTeamId);
      }
    }

    emitWorkspacePresence(normalizedTeamId);
  };
};

const publishTeamWorkspaceEvent = ({ teamId, type, actorId = null, payload = {} }) => {
  emitToWorkspaceSubscribers(normalizeId(teamId), "workspace_event", {
    type,
    actorId: actorId ? normalizeId(actorId) : null,
    payload,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  registerNotificationStream,
  publishNotificationEvent,
  registerTeamWorkspaceStream,
  publishTeamWorkspaceEvent,
};
