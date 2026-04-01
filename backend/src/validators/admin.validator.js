const { z } = require("zod");
const { GLOBAL_ROLES, USER_STATUSES } = require("../utils/constants");

const updateUserStatusSchema = z.object({
  status: z.enum([USER_STATUSES.APPROVED, USER_STATUSES.REJECTED]),
  role: z.enum([GLOBAL_ROLES.ADMIN, GLOBAL_ROLES.MEMBER]).optional(),
});

const issueWarningSchema = z.object({
  message: z.string().trim().min(5).max(300),
});

const requiredReasonSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

const suspendUserSchema = z.object({
  reason: z.string().trim().min(5).max(500),
  until: z.coerce.date().optional(),
});

const optionalReasonSchema = z.object({
  reason: z.string().trim().min(5).max(500).optional(),
});

module.exports = {
  updateUserStatusSchema,
  issueWarningSchema,
  requiredReasonSchema,
  suspendUserSchema,
  optionalReasonSchema,
};
