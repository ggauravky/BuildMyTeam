const express = require("express");
const {
  listUsers,
  updateUserStatus,
  listTeams,
  listHackathons,
  listEvents,
  removeTeamMemberByAdmin,
} = require("../controllers/admin.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireGlobalRole } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { updateUserStatusSchema } = require("../validators/admin.validator");
const { GLOBAL_ROLES } = require("../utils/constants");

const router = express.Router();

router.use(requireAuth, requireGlobalRole(GLOBAL_ROLES.ADMIN));

router.get("/users", listUsers);
router.patch("/users/:id/status", validate(updateUserStatusSchema), updateUserStatus);
router.get("/teams", listTeams);
router.delete("/teams/:teamId/members/:userId", removeTeamMemberByAdmin);
router.get("/hackathons", listHackathons);
router.get("/events", listEvents);

module.exports = router;
