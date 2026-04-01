const ModerationAuditLog = require("../models/ModerationAuditLog");

const createModerationAuditLog = async ({ targetUser, action, performedBy, reason = "", metadata = {} }) => {
  return ModerationAuditLog.create({
    targetUser,
    action,
    performedBy,
    reason,
    metadata,
  });
};

module.exports = {
  createModerationAuditLog,
};
