const { GLOBAL_ROLES, USER_STATUSES } = require("../utils/constants");

const requireApprovedUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.user.role === GLOBAL_ROLES.ADMIN) {
    return next();
  }

  if (req.user.status !== USER_STATUSES.APPROVED) {
    return res.status(403).json({ message: "Account is pending admin approval." });
  }

  return next();
};

module.exports = {
  requireApprovedUser,
};
