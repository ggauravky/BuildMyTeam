const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_BY_TYPE,
} = require("../utils/constants");
const { publishNotificationEvent } = require("./realtime.service");

const DEFAULT_ENABLED_PRIORITIES = Object.values(NOTIFICATION_PRIORITIES);

const toMinutesFromHHMM = (value) => {
  const [hoursString, minutesString] = String(value || "00:00").split(":");
  const hours = Number.parseInt(hoursString || "0", 10);
  const minutes = Number.parseInt(minutesString || "0", 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
};

const getMinutesInTimezone = (currentDate, timezone) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const parts = formatter.formatToParts(currentDate);
    const hourPart = parts.find((part) => part.type === "hour")?.value;
    const minutePart = parts.find((part) => part.type === "minute")?.value;
    const hours = Number.parseInt(hourPart || "0", 10);
    const minutes = Number.parseInt(minutePart || "0", 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return currentDate.getHours() * 60 + currentDate.getMinutes();
    }

    return hours * 60 + minutes;
  } catch {
    return currentDate.getHours() * 60 + currentDate.getMinutes();
  }
};

const isWithinQuietHours = (quietHours, currentDate = new Date()) => {
  const startMinutes = toMinutesFromHHMM(quietHours.start || "22:00");
  const endMinutes = toMinutesFromHHMM(quietHours.end || "08:00");
  const nowMinutes = getMinutesInTimezone(currentDate, quietHours.timezone);

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
};

const normalizeNotificationPreferences = (preferences = {}) => {
  const enabledPriorities = Array.from(
    new Set(
      (preferences.enabledPriorities || [])
        .map((entry) => String(entry || "").trim())
        .filter((entry) => DEFAULT_ENABLED_PRIORITIES.includes(entry))
    )
  );

  const mutedTypes = Array.from(
    new Set(
      (preferences.mutedTypes || [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    )
  );

  return {
    inAppEnabled: preferences.inAppEnabled !== false,
    enabledPriorities: enabledPriorities.length ? enabledPriorities : DEFAULT_ENABLED_PRIORITIES,
    mutedTypes,
    quietHours: {
      enabled: Boolean(preferences.quietHours?.enabled),
      start: preferences.quietHours?.start || "22:00",
      end: preferences.quietHours?.end || "08:00",
      timezone: preferences.quietHours?.timezone || "UTC",
    },
  };
};

const resolveNotificationPriority = (type, explicitPriority) => {
  if (explicitPriority && DEFAULT_ENABLED_PRIORITIES.includes(explicitPriority)) {
    return explicitPriority;
  }

  return NOTIFICATION_PRIORITY_BY_TYPE[type] || NOTIFICATION_PRIORITIES.MEDIUM;
};

const shouldDeliverNotification = ({ preferences, type, priority, currentDate = new Date() }) => {
  if (!preferences.inAppEnabled) {
    return false;
  }

  if (!preferences.enabledPriorities.includes(priority)) {
    return false;
  }

  if (preferences.mutedTypes.includes(type)) {
    return false;
  }

  if (
    preferences.quietHours.enabled &&
    (priority === NOTIFICATION_PRIORITIES.LOW || priority === NOTIFICATION_PRIORITIES.MEDIUM) &&
    isWithinQuietHours(preferences.quietHours, currentDate)
  ) {
    return false;
  }

  return true;
};

const createNotification = async ({ user, type, message, data = {}, priority }) => {
  const resolvedPriority = resolveNotificationPriority(type, priority);
  const targetUser = await User.findById(user).select("notificationPreferences").lean();

  if (!targetUser) {
    return null;
  }

  const normalizedPreferences = normalizeNotificationPreferences(targetUser.notificationPreferences);

  if (
    !shouldDeliverNotification({
      preferences: normalizedPreferences,
      type,
      priority: resolvedPriority,
    })
  ) {
    return null;
  }

  const notification = await Notification.create({
    user,
    type,
    message,
    priority: resolvedPriority,
    data,
  });

  publishNotificationEvent({ userId: user, notification });

  return notification;
};

const createBulkNotifications = async (notifications) => {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  const notificationsWithPriority = notifications.map((notification) => ({
    ...notification,
    priority: resolveNotificationPriority(notification.type, notification.priority),
  }));

  const uniqueUserIds = Array.from(
    new Set(
      notificationsWithPriority
        .map((notification) => notification.user?.toString?.() || String(notification.user))
        .filter(Boolean)
    )
  );

  const userPreferences = await User.find({ _id: { $in: uniqueUserIds } })
    .select("notificationPreferences")
    .lean();

  const preferenceMap = new Map(
    userPreferences.map((user) => [
      user._id.toString(),
      normalizeNotificationPreferences(user.notificationPreferences),
    ])
  );

  const deliverableNotifications = notificationsWithPriority.filter((notification) => {
    const userId = notification.user?.toString?.() || String(notification.user);
    const preferences = preferenceMap.get(userId) || normalizeNotificationPreferences();

    return shouldDeliverNotification({
      preferences,
      type: notification.type,
      priority: notification.priority,
    });
  });

  if (deliverableNotifications.length === 0) {
    return [];
  }

  const createdNotifications = await Notification.insertMany(deliverableNotifications);

  createdNotifications.forEach((notification) => {
    publishNotificationEvent({
      userId: notification.user,
      notification,
    });
  });

  return createdNotifications;
};

module.exports = {
  createNotification,
  createBulkNotifications,
  normalizeNotificationPreferences,
  resolveNotificationPriority,
};
