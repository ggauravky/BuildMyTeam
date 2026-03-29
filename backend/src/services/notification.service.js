const Notification = require("../models/Notification");

const createNotification = async ({ user, type, message, data = {} }) => {
  return Notification.create({
    user,
    type,
    message,
    data,
  });
};

const createBulkNotifications = async (notifications) => {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  return Notification.insertMany(notifications);
};

module.exports = {
  createNotification,
  createBulkNotifications,
};
