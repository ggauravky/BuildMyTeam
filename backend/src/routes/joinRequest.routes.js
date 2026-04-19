const express = require("express");
const {
  createJoinRequestByCode,
  listPendingRequestsForTeam,
  reviewJoinRequest,
  listMyJoinRequests,
  cancelMyJoinRequest,
} = require("../controllers/joinRequest.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireApprovedUser } = require("../middleware/requireApproved.middleware");
const { requireTeamManagerOrAdmin } = require("../middleware/role.middleware");
const { joinByCodeLimiter } = require("../middleware/rateLimit.middleware");
const { validate } = require("../middleware/validate.middleware");
const { joinByCodeSchema } = require("../validators/team.validator");
const { reviewJoinRequestSchema } = require("../validators/joinRequest.validator");

const router = express.Router();

router.use(requireAuth, requireApprovedUser);

router.get("/my", listMyJoinRequests);
router.post("/by-code", joinByCodeLimiter, validate(joinByCodeSchema), createJoinRequestByCode);
router.patch("/:id/cancel", cancelMyJoinRequest);
router.get(
  "/team/:teamId",
  requireTeamManagerOrAdmin((req) => req.params.teamId),
  listPendingRequestsForTeam
);
router.patch("/:id/review", validate(reviewJoinRequestSchema), reviewJoinRequest);

module.exports = router;
