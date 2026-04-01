const express = require("express");
const {
  createTeam,
  listTeams,
  listMyTeams,
  getTeamById,
  updateTeam,
  removeMember,
  transferLeader,
  getTeamJoinQr,
  getTeamHealth,
  updateTeamHealth,
  deleteTeam,
} = require("../controllers/team.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireApprovedUser } = require("../middleware/requireApproved.middleware");
const {
  requireTeamCreatorOrAdmin,
  requireTeamMemberOrAdmin,
} = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createTeamSchema,
  updateTeamSchema,
  transferLeaderSchema,
  updateTeamHealthSchema,
} = require("../validators/team.validator");

const router = express.Router();

router.get("/", listTeams);
router.get("/mine", requireAuth, requireApprovedUser, listMyTeams);
router.post("/", requireAuth, requireApprovedUser, validate(createTeamSchema), createTeam);
router.patch(
  "/:id",
  requireAuth,
  requireApprovedUser,
  requireTeamCreatorOrAdmin(),
  validate(updateTeamSchema),
  updateTeam
);
router.delete(
  "/:id/members/:userId",
  requireAuth,
  requireApprovedUser,
  requireTeamCreatorOrAdmin(),
  removeMember
);
router.patch(
  "/:id/transfer-leader",
  requireAuth,
  requireApprovedUser,
  requireTeamCreatorOrAdmin(),
  validate(transferLeaderSchema),
  transferLeader
);
router.delete("/:id", requireAuth, requireApprovedUser, requireTeamCreatorOrAdmin(), deleteTeam);
router.get("/:id/qr", requireAuth, requireApprovedUser, requireTeamMemberOrAdmin(), getTeamJoinQr);
router.get("/:id/health", requireAuth, requireApprovedUser, requireTeamMemberOrAdmin(), getTeamHealth);
router.patch(
  "/:id/health",
  requireAuth,
  requireApprovedUser,
  requireTeamCreatorOrAdmin(),
  validate(updateTeamHealthSchema),
  updateTeamHealth
);
router.get("/:id", getTeamById);

module.exports = router;
