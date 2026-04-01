const USER_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const MODERATION_ACTIONS = {
  WARNING_ISSUED: "warning_issued",
  SUSPENSION_APPLIED: "suspension_applied",
  SUSPENSION_LIFTED: "suspension_lifted",
  USER_DEACTIVATED: "user_deactivated",
  USER_REACTIVATED: "user_reactivated",
  USER_REMOVED: "user_removed",
  USER_STATUS_UPDATED: "user_status_updated",
};

const TEAM_HEALTH_RISK_LEVELS = {
  ON_TRACK: "on_track",
  WATCH: "watch",
  AT_RISK: "at_risk",
};

const GLOBAL_ROLES = {
  ADMIN: "admin",
  MEMBER: "member",
};

const TEAM_MEMBER_ROLES = {
  LEADER: "leader",
  MEMBER: "member",
};

const TEAM_TRACK_TYPES = {
  HACKATHON: "hackathon",
  EVENT: "event",
};

const JOIN_REQUEST_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

const NOTIFICATION_TYPES = {
  JOIN_REQUEST: "join_request",
  JOIN_APPROVED: "join_approved",
  JOIN_REJECTED: "join_rejected",
  TEAM_UPDATE: "team_update",
  MODERATION_WARNING: "moderation_warning",
  MODERATION_SUSPENSION: "moderation_suspension",
  MODERATION_RESTORED: "moderation_restored",
  ACCOUNT_DEACTIVATED: "account_deactivated",
  SYSTEM: "system",
};

module.exports = {
  USER_STATUSES,
  MODERATION_ACTIONS,
  GLOBAL_ROLES,
  TEAM_MEMBER_ROLES,
  TEAM_TRACK_TYPES,
  TEAM_HEALTH_RISK_LEVELS,
  JOIN_REQUEST_STATUSES,
  NOTIFICATION_TYPES,
};
