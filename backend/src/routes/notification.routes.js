const express = require("express");
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  streamNotifications,
} = require("../controllers/notification.controller");
const { requireAuth, requireStreamAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { updateNotificationPreferencesSchema } = require("../validators/notification.validator");

const router = express.Router();

router.get("/stream", requireStreamAuth, streamNotifications);

router.use(requireAuth);

router.get("/", listNotifications);
router.get("/preferences", getNotificationPreferences);
router.patch(
  "/preferences",
  validate(updateNotificationPreferencesSchema),
  updateNotificationPreferences
);
router.patch("/:id/read", markNotificationRead);
router.patch("/read-all", markAllNotificationsRead);

module.exports = router;
