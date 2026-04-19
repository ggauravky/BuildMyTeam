const express = require("express");
const {
  createTeam,
  listTeams,
  listMyTeams,
  getTeamById,
  getTeamWorkspaceById,
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
  requireTeamManagerOrAdmin,
} = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createTeamSchema,
  updateTeamSchema,
  transferLeaderSchema,
  updateTeamHealthSchema,
} = require("../validators/team.validator");
const {
  createTaskSchema,
  updateTaskSchema,
  updateCapacitySchema,
  updateOnboardingPackSchema,
  createDecisionLogSchema,
  updateDecisionLogSchema,
  createOwnershipEntrySchema,
  updateOwnershipEntrySchema,
} = require("../validators/workspace.validator");
const {
  listTaskBoard,
  createTask,
  updateTask,
  getTeamCapacity,
  updateMemberCapacity,
  getActionCenter,
  listOnboardingPack,
  initOnboardingPackForMember,
  updateOnboardingPack,
  listDecisionLog,
  createDecisionLogEntry,
  updateDecisionLogEntry,
  listOwnershipLedger,
  createOwnershipEntry,
  updateOwnershipEntry,
} = require("../controllers/workspace.controller");

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
router.get(
  "/:id/action-center",
  requireAuth,
  requireApprovedUser,
  requireTeamMemberOrAdmin(),
  getActionCenter
);
router.get("/:id/tasks", requireAuth, requireApprovedUser, requireTeamMemberOrAdmin(), listTaskBoard);
router.post(
  "/:id/tasks",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  validate(createTaskSchema),
  createTask
);
router.patch(
  "/:id/tasks/:taskId",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  validate(updateTaskSchema),
  updateTask
);
router.get("/:id/capacity", requireAuth, requireApprovedUser, requireTeamMemberOrAdmin(), getTeamCapacity);
router.patch(
  "/:id/capacity/:memberId",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  validate(updateCapacitySchema),
  updateMemberCapacity
);
router.get(
  "/:id/onboarding-pack",
  requireAuth,
  requireApprovedUser,
  requireTeamMemberOrAdmin(),
  listOnboardingPack
);
router.post(
  "/:id/onboarding-pack/:memberId/init",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  initOnboardingPackForMember
);
router.patch(
  "/:id/onboarding-pack/:recordId",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  validate(updateOnboardingPackSchema),
  updateOnboardingPack
);
router.get(
  "/:id/decision-log",
  requireAuth,
  requireApprovedUser,
  requireTeamMemberOrAdmin(),
  listDecisionLog
);
router.post(
  "/:id/decision-log",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  validate(createDecisionLogSchema),
  createDecisionLogEntry
);
router.patch(
  "/:id/decision-log/:decisionId",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  validate(updateDecisionLogSchema),
  updateDecisionLogEntry
);
router.get(
  "/:id/ownership-ledger",
  requireAuth,
  requireApprovedUser,
  requireTeamMemberOrAdmin(),
  listOwnershipLedger
);
router.post(
  "/:id/ownership-ledger",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  validate(createOwnershipEntrySchema),
  createOwnershipEntry
);
router.patch(
  "/:id/ownership-ledger/:entryId",
  requireAuth,
  requireApprovedUser,
  requireTeamManagerOrAdmin(),
  validate(updateOwnershipEntrySchema),
  updateOwnershipEntry
);
router.get(
  "/:id/workspace",
  requireAuth,
  requireApprovedUser,
  requireTeamMemberOrAdmin(),
  getTeamWorkspaceById
);
router.get("/:id", getTeamById);

module.exports = router;
