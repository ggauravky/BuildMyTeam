const express = require("express");
const { signup, login, getCurrentUser } = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate.middleware");
const { signupSchema, loginSchema } = require("../validators/auth.validator");
const { requireAuth } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);
router.get("/me", requireAuth, getCurrentUser);

module.exports = router;
