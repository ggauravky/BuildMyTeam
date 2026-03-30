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

    const user = await User.findById(userId).select("role status");

    if (!user) {
      return res.status(401).json({ message: "Invalid or expired authentication token." });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      status: user.status,
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
