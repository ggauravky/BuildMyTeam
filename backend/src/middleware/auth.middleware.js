const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
};

const requireAuth = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      id: decoded.sub || decoded.id,
      role: decoded.role,
      status: decoded.status,
    };

    if (!req.user.id) {
      return res.status(401).json({ message: "Invalid authentication token." });
    }

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired authentication token." });
  }
};

module.exports = {
  requireAuth,
};
