const { z } = require("zod");
const { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } = require("../utils/constants");

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const notificationPriorityEnum = z.enum(Object.values(NOTIFICATION_PRIORITIES));
const notificationTypeEnum = z.enum(Object.values(NOTIFICATION_TYPES));

const updateNotificationPreferencesSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    enabledPriorities: z.array(notificationPriorityEnum).max(4).optional(),
    mutedTypes: z.array(notificationTypeEnum).max(20).optional(),
    quietHours: z
      .object({
        enabled: z.boolean().optional(),
        start: z.string().trim().regex(HH_MM_REGEX).optional(),
        end: z.string().trim().regex(HH_MM_REGEX).optional(),
        timezone: z.string().trim().min(1).max(80).optional(),
      })
      .optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one notification preference field is required.",
  });

module.exports = {
  updateNotificationPreferencesSchema,
};
