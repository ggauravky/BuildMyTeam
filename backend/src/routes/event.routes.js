const express = require("express");
const {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/event.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireGlobalRole } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createEventSchema, updateEventSchema } = require("../validators/event.validator");
const { GLOBAL_ROLES } = require("../utils/constants");

const router = express.Router();

router.get("/", listEvents);
router.post(
  "/",
  requireAuth,
  requireGlobalRole(GLOBAL_ROLES.ADMIN),
  validate(createEventSchema),
  createEvent
);
router.patch(
  "/:id",
  requireAuth,
  requireGlobalRole(GLOBAL_ROLES.ADMIN),
  validate(updateEventSchema),
  updateEvent
);
router.delete("/:id", requireAuth, requireGlobalRole(GLOBAL_ROLES.ADMIN), deleteEvent);

module.exports = router;
