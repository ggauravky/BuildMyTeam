const { z } = require("zod");
const { GLOBAL_ROLES, USER_STATUSES } = require("../utils/constants");

const updateUserStatusSchema = z.object({
  status: z.enum([USER_STATUSES.APPROVED, USER_STATUSES.REJECTED]),
  role: z.enum([GLOBAL_ROLES.ADMIN, GLOBAL_ROLES.MEMBER]).optional(),
});

module.exports = {
  updateUserStatusSchema,
};
