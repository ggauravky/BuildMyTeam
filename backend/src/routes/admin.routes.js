const express = require("express");
const {
  listUsers,
  updateUserStatus,
  issueUserWarning,
  suspendUser,
  unsuspendUser,
  deactivateUser,
  reactivateUser,
  removeUserByAdmin,
  listModerationAuditLogs,
  getCommandCenterOverview,
  listTeams,
  listHackathons,
  listEvents,
  removeTeamMemberByAdmin,
} = require("../controllers/admin.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireGlobalRole } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  updateUserStatusSchema,
  issueWarningSchema,
  requiredReasonSchema,
  suspendUserSchema,
  optionalReasonSchema,
} = require("../validators/admin.validator");
const { GLOBAL_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth, requireGlobalRole(GLOBAL_ROLES.ADMIN));

router.get("/command-center", getCommandCenterOverview);
router.get("/users", listUsers);
router.patch("/users/:id/status", validate(updateUserStatusSchema), updateUserStatus);
router.post("/users/:id/warnings", validate(issueWarningSchema), issueUserWarning);
router.post("/users/:id/suspend", validate(suspendUserSchema), suspendUser);
router.post("/users/:id/unsuspend", validate(optionalReasonSchema), unsuspendUser);
router.post("/users/:id/deactivate", validate(requiredReasonSchema), deactivateUser);
router.post("/users/:id/reactivate", validate(optionalReasonSchema), reactivateUser);
router.delete("/users/:id", removeUserByAdmin);
router.get("/moderation/audits", listModerationAuditLogs);
router.get("/teams", listTeams);
router.delete("/teams/:teamId/members/:userId", removeTeamMemberByAdmin);
router.get("/hackathons", listHackathons);
router.get("/events", listEvents);

module.exports = router;
