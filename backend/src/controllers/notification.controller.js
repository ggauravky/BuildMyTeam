const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");

const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { user: req.user.id };
  if (req.query.unreadOnly === "true") {
    filter.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return res.json({
    notifications,
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

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
