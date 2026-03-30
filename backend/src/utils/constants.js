const USER_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
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
  SYSTEM: "system",
};

module.exports = {
  USER_STATUSES,
  GLOBAL_ROLES,
  TEAM_MEMBER_ROLES,
  TEAM_TRACK_TYPES,
  JOIN_REQUEST_STATUSES,
  NOTIFICATION_TYPES,
};
