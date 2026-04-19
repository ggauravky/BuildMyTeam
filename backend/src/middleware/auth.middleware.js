const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const User = require("../models/User");

const getTokenFromRequest = (req, { allowQueryToken = false } = {}) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  if (allowQueryToken && req.query?.accessToken) {
    return String(req.query.accessToken).trim();
  }

  return null;
};

const resolveSuspensionMessage = (suspension) => {
  if (!suspension?.until) {
    return "Your account is suspended. Please contact an administrator.";
  }

  return `Your account is suspended until ${new Date(suspension.until).toISOString()}.`;
};

const resolveAuthenticatedUser = async (token) => {
  const decoded = jwt.verify(token, jwtSecret);

  const userId = decoded.sub || decoded.id;
  if (!userId) {
    const tokenError = new Error("Invalid authentication token.");
    tokenError.statusCode = 401;
    throw tokenError;
  }

  const user = await User.findById(userId).select(
    "role status moderation.suspension moderation.deactivation moderation.warnings"
  );

  if (!user) {
    const missingUserError = new Error("Invalid or expired authentication token.");
    missingUserError.statusCode = 401;
    throw missingUserError;
  }

  if (user.moderation?.deactivation?.isDeactivated) {
    const deactivatedError = new Error("Your account has been deactivated by an administrator.");
    deactivatedError.statusCode = 403;
    throw deactivatedError;
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
      const suspensionError = new Error(resolveSuspensionMessage(suspension));
      suspensionError.statusCode = 403;
      throw suspensionError;
    }
  }

  return {
    id: user._id.toString(),
    role: user.role,
    status: user.status,
    warningCount: user.moderation?.warnings?.length || 0,
    isSuspended: false,
    isDeactivated: false,
  };
};

const createAuthGuard = ({ allowQueryToken = false } = {}) => async (req, res, next) => {
  const token = getTokenFromRequest(req, { allowQueryToken });

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    req.user = await resolveAuthenticatedUser(token);

    return next();
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired authentication token." });
    }

    return next(error);
  }
};

const requireAuth = createAuthGuard();
const requireStreamAuth = createAuthGuard({ allowQueryToken: true });

module.exports = {
  requireAuth,
  requireStreamAuth,
};
