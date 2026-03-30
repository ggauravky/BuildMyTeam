const express = require("express");
const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const hackathonRoutes = require("./hackathon.routes");
const eventRoutes = require("./event.routes");
const teamRoutes = require("./team.routes");
const joinRequestRoutes = require("./joinRequest.routes");
const notificationRoutes = require("./notification.routes");
const profileRoutes = require("./profile.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/hackathons", hackathonRoutes);
router.use("/events", eventRoutes);
router.use("/teams", teamRoutes);
router.use("/join-requests", joinRequestRoutes);
router.use("/notifications", notificationRoutes);
router.use("/profile", profileRoutes);

module.exports = router;
