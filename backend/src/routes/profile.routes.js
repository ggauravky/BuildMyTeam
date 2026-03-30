const express = require("express");
const {
	getMyProfile,
	updateMyProfile,
	getPublicProfileByUsername,
} = require("../controllers/profile.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireApprovedUser } = require("../middleware/requireApproved.middleware");
const { validate } = require("../middleware/validate.middleware");
const { updateProfileSchema } = require("../validators/profile.validator");

const router = express.Router();

router.get("/me", requireAuth, requireApprovedUser, getMyProfile);
router.patch(
	"/me",
	requireAuth,
	requireApprovedUser,
	validate(updateProfileSchema),
	updateMyProfile
);
router.get("/:username", getPublicProfileByUsername);

module.exports = router;
