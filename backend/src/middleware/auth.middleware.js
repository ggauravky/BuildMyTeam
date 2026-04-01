const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const User = require("../models/User");

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
};

const resolveSuspensionMessage = (suspension) => {
  if (!suspension?.until) {
    return "Your account is suspended. Please contact an administrator.";
  }

  return `Your account is suspended until ${new Date(suspension.until).toISOString()}.`;
};

const requireAuth = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    const userId = decoded.sub || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid authentication token." });
    }

    const user = await User.findById(userId).select(
      "role status moderation.suspension moderation.deactivation moderation.warnings"
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid or expired authentication token." });
    }

    if (user.moderation?.deactivation?.isDeactivated) {
      return res.status(403).json({ message: "Your account has been deactivated by an administrator." });
    }

    const suspension = user.moderation?.suspension;

    if (suspension?.isSuspended) {
      const now = Date.now();
      const suspensionUntilMs = suspension.until ? new Date(suspension.until).getTime() : null;
      const isExpired = suspensionUntilMs !== null && suspensionUntilMs <= now;

      if (isExpired) {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              "moderation.suspension.isSuspended": false,
              "moderation.suspension.liftedAt": new Date(),
            },
          }
        );
      } else {
        return res.status(403).json({ message: resolveSuspensionMessage(suspension) });
      }
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      status: user.status,
      warningCount: user.moderation?.warnings?.length || 0,
      isSuspended: false,
      isDeactivated: false,
    };

    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired authentication token." });
    }

    return next(error);
  }
};

module.exports = {
  requireAuth,
};
