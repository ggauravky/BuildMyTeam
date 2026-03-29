const express = require("express");
const {
  listHackathons,
  createHackathon,
  updateHackathon,
  deleteHackathon,
} = require("../controllers/hackathon.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireGlobalRole } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createHackathonSchema,
  updateHackathonSchema,
} = require("../validators/hackathon.validator");
const { GLOBAL_ROLES } = require("../utils/constants");

const router = express.Router();

router.get("/", listHackathons);
router.post(
  "/",
  requireAuth,
  requireGlobalRole(GLOBAL_ROLES.ADMIN),
  validate(createHackathonSchema),
  createHackathon
);
router.patch(
  "/:id",
  requireAuth,
  requireGlobalRole(GLOBAL_ROLES.ADMIN),
  validate(updateHackathonSchema),
  updateHackathon
);
router.delete("/:id", requireAuth, requireGlobalRole(GLOBAL_ROLES.ADMIN), deleteHackathon);

module.exports = router;
