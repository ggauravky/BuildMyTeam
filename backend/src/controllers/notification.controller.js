const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { NOTIFICATION_PRIORITIES } = require("../utils/constants");
const { normalizeNotificationPreferences } = require("../services/notification.service");
const asyncHandler = require("../utils/asyncHandler");

const NOTIFICATION_PRIORITY_VALUES = Object.values(NOTIFICATION_PRIORITIES);

const parsePriorityQuery = (queryValue) => {
  if (!queryValue) {
    return [];
  }

  return Array.from(
    new Set(
      String(queryValue)
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => NOTIFICATION_PRIORITY_VALUES.includes(entry))
    )
  );
};

const buildPriorityCounts = (aggregationRows) => {
  const countsByPriority = {
    [NOTIFICATION_PRIORITIES.LOW]: 0,
    [NOTIFICATION_PRIORITIES.MEDIUM]: 0,
    [NOTIFICATION_PRIORITIES.HIGH]: 0,
    [NOTIFICATION_PRIORITIES.CRITICAL]: 0,
  };

  aggregationRows.forEach((row) => {
    if (row && row._id && Object.hasOwn(countsByPriority, row._id)) {
      countsByPriority[row._id] = row.count;
    }
  });

  return countsByPriority;
};

const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const selectedPriorities = parsePriorityQuery(req.query.priorities);

  const filter = { user: req.user.id };
  if (req.query.unreadOnly === "true") {
    filter.isRead = false;
  }

  if (selectedPriorities.length > 0) {
    filter.priority = { $in: selectedPriorities };
  }

  const summaryFilter = { ...filter, user: new mongoose.Types.ObjectId(req.user.id) };

  const [notifications, total, unreadCount, priorityRows] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
    Notification.aggregate([
      { $match: summaryFilter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
  ]);

  return res.json({
    notifications,
    summary: {
      unreadCount,
      countsByPriority: buildPriorityCounts(priorityRows),
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: req.user.id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: "Notification not found." });
  }

  return res.json({
    message: "Notification marked as read.",
    notification,
  });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { $set: { isRead: true } }
  );

  return res.json({ message: "All notifications marked as read." });
});

const getNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("notificationPreferences").lean();

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    preferences: normalizeNotificationPreferences(user.notificationPreferences),
  });
});

const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("notificationPreferences");

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const currentPreferences = normalizeNotificationPreferences(user.notificationPreferences);

  const nextPreferences = {
    inAppEnabled: req.body.inAppEnabled ?? currentPreferences.inAppEnabled,
    enabledPriorities:
      req.body.enabledPriorities && req.body.enabledPriorities.length
        ? Array.from(new Set(req.body.enabledPriorities))
        : currentPreferences.enabledPriorities,
    mutedTypes:
      req.body.mutedTypes !== undefined
        ? Array.from(new Set(req.body.mutedTypes))
        : currentPreferences.mutedTypes,
    quietHours: {
      enabled: req.body.quietHours?.enabled ?? currentPreferences.quietHours.enabled,
      start: req.body.quietHours?.start ?? currentPreferences.quietHours.start,
      end: req.body.quietHours?.end ?? currentPreferences.quietHours.end,
      timezone: req.body.quietHours?.timezone ?? currentPreferences.quietHours.timezone,
    },
  };

  user.notificationPreferences = nextPreferences;
  await user.save();

  return res.json({
    message: "Notification preferences updated successfully.",
    preferences: normalizeNotificationPreferences(user.notificationPreferences),
  });
});

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
};
