const express = require("express");
const { getMyProfile } = require("../controllers/profile.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/me", getMyProfile);

module.exports = router;
