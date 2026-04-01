const User = require("../models/User");
const Team = require("../models/Team");
const Hackathon = require("../models/Hackathon");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const JoinRequest = require("../models/JoinRequest");
const ModerationAuditLog = require("../models/ModerationAuditLog");
const asyncHandler = require("../utils/asyncHandler");
const { createBulkNotifications } = require("../services/notification.service");
const { createModerationAuditLog } = require("../services/moderationAudit.service");
const {
  GLOBAL_ROLES,
  MODERATION_ACTIONS,
  NOTIFICATION_TYPES,
  TEAM_HEALTH_RISK_LEVELS,
  TEAM_MEMBER_ROLES,
  USER_STATUSES,
} = require("../utils/constants");

const escapeRegex = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const normalizePaging = (pageInput, limitInput) => {
  const page = Math.max(1, Number.parseInt(pageInput || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitInput || "20", 10) || 20));
  return { page, limit };
};

const createNotification = async ({ user, type, message, data = {} }) => {
  await Notification.create({ user, type, message, data });
};

const buildUsersFilter = ({ statusInput, roleInput, queryInput }) => {
  const conditions = [];

  const status = String(statusInput || "").trim().toLowerCase();
  if (status) {
    if (
      status === USER_STATUSES.PENDING ||
      status === USER_STATUSES.APPROVED ||
      status === USER_STATUSES.REJECTED
    ) {
      conditions.push({ status });
    } else if (status === "suspended") {
      conditions.push({ "moderation.suspension.isSuspended": true });
      conditions.push({
        $or: [
          { "moderation.suspension.until": null },
          { "moderation.suspension.until": { $gt: new Date() } },
        ],
      });
    } else if (status === "deactivated") {
      conditions.push({ "moderation.deactivation.isDeactivated": true });
    }
  }

  const role = String(roleInput || "").trim().toLowerCase();
  if (role) {
    conditions.push({ role });
  }

  const query = String(queryInput || "").trim();
  if (query) {
    const pattern = escapeRegex(query);
    conditions.push({
      $or: [
        { name: { $regex: pattern, $options: "i" } },
        { email: { $regex: pattern, $options: "i" } },
        { username: { $regex: pattern, $options: "i" } },
      ],
    });
  }

  return conditions.length ? { $and: conditions } : {};
};

const buildTeamRiskSummary = (team) => {
  const health = team.health || {};
  const checklist = health.checklist || [];
  const completedChecklistCount = checklist.filter((item) => item.completed).length;
  const checklistCompletionPercent = checklist.length
    ? Math.round((completedChecklistCount / checklist.length) * 100)
    : 0;

  const progressPercent = Number(health.progressPercent || 0);
  const blockers = String(health.blockers || "").trim();
  const lastActivityAt = health.lastActivityAt || team.updatedAt || team.createdAt;
  const inactiveDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  let score = 0;

  if (progressPercent < 30) {
    score += 2;
  } else if (progressPercent < 60) {
    score += 1;
  }

  if (blockers) {
    score += 2;
  }

  if (inactiveDays >= 5) {
    score += 2;
  } else if (inactiveDays >= 3) {
    score += 1;
  }

  if (checklistCompletionPercent < 40) {
    score += 1;
  }

  let riskLevel = TEAM_HEALTH_RISK_LEVELS.ON_TRACK;
  if (score >= 5) {
    riskLevel = TEAM_HEALTH_RISK_LEVELS.AT_RISK;
  } else if (score >= 3) {
    riskLevel = TEAM_HEALTH_RISK_LEVELS.WATCH;
  }

  return {
    riskLevel,
    progressPercent,
    checklistCompletionPercent,
    blockers,
    inactiveDays,
    lastActivityAt,
  };
};

const ensureCanModerateTarget = (targetUser, adminUserId) => {
  if (targetUser.role === GLOBAL_ROLES.ADMIN) {
    return "Admin users cannot be moderated through this endpoint.";
  }

  if (targetUser._id.toString() === adminUserId) {
    return "You cannot moderate your own account.";
  }

  return "";
};

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit } = normalizePaging(req.query.page, req.query.limit);
  const skip = (page - 1) * limit;
  const filter = buildUsersFilter({
    statusInput: req.query.status,
    roleInput: req.query.role,
    queryInput: req.query.q,
  });

  const activeSuspensionExpression = {
    $and: [
      { $eq: ["$moderation.suspension.isSuspended", true] },
      {
        $or: [
          { $eq: ["$moderation.suspension.until", null] },
          { $gt: ["$moderation.suspension.until", new Date()] },
        ],
      },
    ],
  };

  const [users, total] = await Promise.all([
    User.aggregate([
      { $match: filter },
      {
        $addFields: {
          isSuspended: activeSuspensionExpression,
          isDeactivated: { $ifNull: ["$moderation.deactivation.isDeactivated", false] },
          warningCount: { $size: { $ifNull: ["$moderation.warnings", []] } },
        },
      },
      {
        $addFields: {
          statusPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", USER_STATUSES.PENDING] }, then: 0 },
                { case: "$isSuspended", then: 1 },
                { case: { $eq: ["$status", USER_STATUSES.APPROVED] }, then: 2 },
                { case: { $eq: ["$status", USER_STATUSES.REJECTED] }, then: 3 },
                { case: "$isDeactivated", then: 4 },
              ],
              default: 5,
            },
          },
        },
      },
      { $sort: { statusPriority: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          name: 1,
          email: 1,
          username: 1,
          role: 1,
          status: 1,
          headline: 1,
          bio: 1,
          skills: 1,
          socialLinks: 1,
          teams: 1,
          teamCount: { $size: { $ifNull: ["$teams", []] } },
          warningCount: 1,
          moderation: {
            isSuspended: "$isSuspended",
            suspensionUntil: "$moderation.suspension.until",
            isDeactivated: "$isDeactivated",
          },
          createdAt: 1,
        },
      },
    ]),
    User.countDocuments(filter),
  ]);

  return res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, role } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  user.status = status;
  if (role) {
    user.role = role;
  }

  await user.save();

  await Notification.create({
    user: user._id,
    type: NOTIFICATION_TYPES.SYSTEM,
    message:
      status === USER_STATUSES.APPROVED
        ? "Your account has been approved by admin."
        : "Your account has been rejected by admin.",
    data: { status },
  });

  await createModerationAuditLog({
    targetUser: user._id,
    action: MODERATION_ACTIONS.USER_STATUS_UPDATED,
    performedBy: req.user.id,
    reason: `Status updated to ${status}`,
    metadata: {
      status,
      role: role || user.role,
    },
  });

  return res.json({
    message: "User status updated successfully.",
    user: user.toSafeObject(),
  });
});

const issueUserWarning = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const moderationError = ensureCanModerateTarget(user, req.user.id);
  if (moderationError) {
    return res.status(400).json({ message: moderationError });
  }

  user.moderation.warnings.push({
    message,
    issuedBy: req.user.id,
    issuedAt: new Date(),
  });

  await user.save();

  await createNotification({
    user: user._id,
    type: NOTIFICATION_TYPES.MODERATION_WARNING,
    message: `Admin warning: ${message}`,
    data: {
      warningCount: user.moderation.warnings.length,
    },
  });

  await createModerationAuditLog({
    targetUser: user._id,
    action: MODERATION_ACTIONS.WARNING_ISSUED,
    performedBy: req.user.id,
    reason: message,
    metadata: {
      warningCount: user.moderation.warnings.length,
    },
  });

  return res.json({
    message: "Warning issued successfully.",
    warningCount: user.moderation.warnings.length,
    user: user.toSafeObject(),
  });
});

const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, until } = req.body;
  const untilDate = until ? new Date(until) : null;

  if (until && Number.isNaN(untilDate.getTime())) {
    return res.status(400).json({ message: "Invalid suspension end date." });
  }

  if (untilDate && untilDate.getTime() <= Date.now()) {
    return res.status(400).json({ message: "Suspension end date must be in the future." });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const moderationError = ensureCanModerateTarget(user, req.user.id);
  if (moderationError) {
    return res.status(400).json({ message: moderationError });
  }

  user.moderation.suspension.isSuspended = true;
  user.moderation.suspension.reason = reason;
  user.moderation.suspension.until = untilDate;
  user.moderation.suspension.suspendedAt = new Date();
  user.moderation.suspension.suspendedBy = req.user.id;
  user.moderation.suspension.liftedAt = null;
  user.moderation.suspension.liftedBy = null;
  await user.save();

  await createNotification({
    user: user._id,
    type: NOTIFICATION_TYPES.MODERATION_SUSPENSION,
    message: untilDate
      ? `Your account is suspended until ${untilDate.toISOString()}.`
      : "Your account has been suspended by an administrator.",
    data: {
      reason,
      until: untilDate,
    },
  });

  await createModerationAuditLog({
    targetUser: user._id,
    action: MODERATION_ACTIONS.SUSPENSION_APPLIED,
    performedBy: req.user.id,
    reason,
    metadata: {
      until: untilDate,
    },
  });

  return res.json({
    message: "User suspended successfully.",
    user: user.toSafeObject(),
  });
});

const unsuspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "Suspension lifted by admin." } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const moderationError = ensureCanModerateTarget(user, req.user.id);
  if (moderationError) {
    return res.status(400).json({ message: moderationError });
  }

  user.moderation.suspension.isSuspended = false;
  user.moderation.suspension.liftedAt = new Date();
  user.moderation.suspension.liftedBy = req.user.id;
  await user.save();

  await createNotification({
    user: user._id,
    type: NOTIFICATION_TYPES.MODERATION_RESTORED,
    message: "Your account suspension has been lifted.",
    data: {},
  });

  await createModerationAuditLog({
    targetUser: user._id,
    action: MODERATION_ACTIONS.SUSPENSION_LIFTED,
    performedBy: req.user.id,
    reason,
  });

  return res.json({
    message: "User suspension lifted successfully.",
    user: user.toSafeObject(),
  });
});

const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const moderationError = ensureCanModerateTarget(user, req.user.id);
  if (moderationError) {
    return res.status(400).json({ message: moderationError });
  }

  user.moderation.deactivation.isDeactivated = true;
  user.moderation.deactivation.reason = reason;
  user.moderation.deactivation.deactivatedAt = new Date();
  user.moderation.deactivation.deactivatedBy = req.user.id;
  user.moderation.suspension.isSuspended = false;
  user.moderation.suspension.liftedAt = new Date();
  user.moderation.suspension.liftedBy = req.user.id;
  await user.save();

  await createNotification({
    user: user._id,
    type: NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED,
    message: "Your account has been deactivated by an administrator.",
    data: { reason },
  });

  await createModerationAuditLog({
    targetUser: user._id,
    action: MODERATION_ACTIONS.USER_DEACTIVATED,
    performedBy: req.user.id,
    reason,
  });

  return res.json({
    message: "User deactivated successfully.",
    user: user.toSafeObject(),
  });
});

const reactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "User account reactivated by admin." } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const moderationError = ensureCanModerateTarget(user, req.user.id);
  if (moderationError) {
    return res.status(400).json({ message: moderationError });
  }

  user.moderation.deactivation.isDeactivated = false;
  user.moderation.deactivation.reactivatedAt = new Date();
  user.moderation.deactivation.reactivatedBy = req.user.id;
  await user.save();

  await createNotification({
    user: user._id,
    type: NOTIFICATION_TYPES.MODERATION_RESTORED,
    message: "Your account has been reactivated.",
    data: {},
  });

  await createModerationAuditLog({
    targetUser: user._id,
    action: MODERATION_ACTIONS.USER_REACTIVATED,
    performedBy: req.user.id,
    reason,
  });

  return res.json({
    message: "User reactivated successfully.",
    user: user.toSafeObject(),
  });
});

const listModerationAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit } = normalizePaging(req.query.page, req.query.limit);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.action) {
    filter.action = String(req.query.action).trim();
  }

  if (req.query.targetUserId) {
    filter.targetUser = req.query.targetUserId;
  }

  const [logs, total] = await Promise.all([
    ModerationAuditLog.find(filter)
      .populate("targetUser", "name email username")
      .populate("performedBy", "name email username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ModerationAuditLog.countDocuments(filter),
  ]);

  return res.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const getCommandCenterOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    usersOverview,
    teams,
    pendingJoinRequests,
    upcomingHackathons,
    upcomingEvents,
    recentModeration,
    moderationActionsLast7Days,
  ] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", USER_STATUSES.PENDING] }, 1, 0],
            },
          },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$status", USER_STATUSES.APPROVED] }, 1, 0],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$status", USER_STATUSES.REJECTED] }, 1, 0],
            },
          },
          suspended: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$moderation.suspension.isSuspended", true] },
                    {
                      $or: [
                        { $eq: ["$moderation.suspension.until", null] },
                        { $gt: ["$moderation.suspension.until", now] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deactivated: {
            $sum: {
              $cond: [{ $eq: ["$moderation.deactivation.isDeactivated", true] }, 1, 0],
            },
          },
        },
      },
    ]),
    Team.find().select("name projectName health members maxSize").lean(),
    JoinRequest.countDocuments({ status: "pending" }),
    Hackathon.find({ date: { $gte: now } }).sort({ date: 1 }).limit(5),
    Event.find({ date: { $gte: now } }).sort({ date: 1 }).limit(5),
    ModerationAuditLog.find()
      .populate("targetUser", "name email username")
      .populate("performedBy", "name email username")
      .sort({ createdAt: -1 })
      .limit(10),
    ModerationAuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]),
  ]);

  const teamRiskSummary = {
    total: teams.length,
    onTrack: 0,
    watch: 0,
    atRisk: 0,
  };

  const atRiskTeams = teams
    .map((team) => {
      const risk = buildTeamRiskSummary(team);

      if (risk.riskLevel === TEAM_HEALTH_RISK_LEVELS.ON_TRACK) {
        teamRiskSummary.onTrack += 1;
      } else if (risk.riskLevel === TEAM_HEALTH_RISK_LEVELS.WATCH) {
        teamRiskSummary.watch += 1;
      } else if (risk.riskLevel === TEAM_HEALTH_RISK_LEVELS.AT_RISK) {
        teamRiskSummary.atRisk += 1;
      }

      return {
        id: team._id,
        name: team.name,
        projectName: team.projectName,
        members: team.members?.length || 0,
        maxSize: team.maxSize,
        ...risk,
      };
    })
    .filter((item) => item.riskLevel !== TEAM_HEALTH_RISK_LEVELS.ON_TRACK)
    .sort((a, b) => {
      if (a.riskLevel === b.riskLevel) {
        return b.inactiveDays - a.inactiveDays;
      }

      return a.riskLevel === TEAM_HEALTH_RISK_LEVELS.AT_RISK ? -1 : 1;
    })
    .slice(0, 10);

  const userSummary = usersOverview[0] || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    deactivated: 0,
  };

  return res.json({
    summary: {
      users: userSummary,
      teams: teamRiskSummary,
      pendingJoinRequests,
    },
    atRiskTeams,
    upcoming: {
      hackathons: upcomingHackathons,
      events: upcomingEvents,
    },
    moderation: {
      recent: recentModeration,
      last7Days: moderationActionsLast7Days,
    },
  });
});

const listTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find()
    .populate("leader", "name email")
    .populate("hackathon", "title date")
    .populate("event", "title date")
    .populate("members.user", "name email username status")
    .sort({ createdAt: -1 });

  const normalizedTeams = teams.map((team) => ({
    ...team.toObject(),
    healthSummary: buildTeamRiskSummary(team),
  }));

  return res.json({ teams: normalizedTeams });
});

const listHackathons = asyncHandler(async (req, res) => {
  const hackathons = await Hackathon.find().sort({ date: 1 });
  return res.json({ hackathons });
});

const listEvents = asyncHandler(async (req, res) => {
  const events = await Event.find().sort({ date: 1 });
  return res.json({ events });
});

const removeTeamMemberByAdmin = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.params;

  const team = await Team.findById(teamId).populate("members.user", "name email");

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (team.leader.toString() === userId) {
    return res.status(400).json({
      message: "Cannot remove team leader directly. Transfer leadership first.",
    });
  }

  const targetMember = team.members.find((entry) => entry.user?._id?.toString() === userId);

  if (!targetMember) {
    return res.status(404).json({ message: "Member not found in this team." });
  }

  if (targetMember.role === TEAM_MEMBER_ROLES.LEADER) {
    return res.status(400).json({
      message: "Cannot remove team leader directly. Transfer leadership first.",
    });
  }

  team.members = team.members.filter((entry) => entry.user?._id?.toString() !== userId);
  team.health.lastActivityAt = new Date();
  await team.save();

  await User.findByIdAndUpdate(userId, { $pull: { teams: team._id } });

  await Notification.create({
    user: userId,
    type: NOTIFICATION_TYPES.TEAM_UPDATE,
    message: `You were removed from team ${team.name} by an admin.`,
    data: { teamId: team._id },
  });

  return res.json({
    message: "Member removed successfully.",
    teamId: team._id,
    userId,
  });
});

const removeUserByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reason = String(req.query.reason || req.body?.reason || "Removed by admin").trim();

  const user = await User.findById(id).select("name email role");

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (user._id.toString() === req.user.id) {
    return res.status(400).json({ message: "You cannot remove your own account." });
  }

  if (user.role === GLOBAL_ROLES.ADMIN) {
    return res.status(400).json({ message: "Admin users cannot be removed through this endpoint." });
  }

  const teams = await Team.find({ "members.user": user._id });
  const deletedTeamIds = [];
  const reassignedLeaderTeamIds = [];
  const impactedMemberIds = new Set();

  for (const team of teams) {
    const wasLeader = team.leader.toString() === user._id.toString();
    team.members = team.members.filter((entry) => entry.user.toString() !== user._id.toString());

    if (team.members.length === 0) {
      deletedTeamIds.push(team._id);
      await Promise.all([
        Team.deleteOne({ _id: team._id }),
        JoinRequest.deleteMany({ team: team._id }),
      ]);
      continue;
    }

    if (wasLeader) {
      const promotedMember = team.members[0];
      team.leader = promotedMember.user;

      team.members.forEach((entry) => {
        entry.role =
          entry.user.toString() === promotedMember.user.toString()
            ? TEAM_MEMBER_ROLES.LEADER
            : TEAM_MEMBER_ROLES.MEMBER;
      });

      reassignedLeaderTeamIds.push(team._id);
    }

    team.health.lastActivityAt = new Date();
    await team.save();

    team.members.forEach((entry) => {
      impactedMemberIds.add(entry.user.toString());
    });
  }

  if (deletedTeamIds.length > 0) {
    await User.updateMany(
      { _id: { $ne: user._id } },
      { $pull: { teams: { $in: deletedTeamIds } } }
    );
  }

  await Promise.all([
    JoinRequest.deleteMany({ user: user._id }),
    JoinRequest.updateMany({ reviewedBy: user._id }, { $set: { reviewedBy: null } }),
    Notification.deleteMany({ user: user._id }),
  ]);

  if (impactedMemberIds.size > 0) {
    await createBulkNotifications(
      Array.from(impactedMemberIds)
        .filter((userId) => userId !== req.user.id)
        .map((memberId) => ({
          user: memberId,
          type: NOTIFICATION_TYPES.TEAM_UPDATE,
          message: `A member account was removed by admin and team memberships were updated.`,
          data: {},
        }))
    );
  }

  await createModerationAuditLog({
    targetUser: user._id,
    action: MODERATION_ACTIONS.USER_REMOVED,
    performedBy: req.user.id,
    reason,
    metadata: {
      deletedTeamCount: deletedTeamIds.length,
      reassignedLeaderTeamCount: reassignedLeaderTeamIds.length,
    },
  });

  await User.deleteOne({ _id: user._id });

  return res.json({
    message: "User removed successfully.",
    removedUser: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    impact: {
      deletedTeamCount: deletedTeamIds.length,
      reassignedLeaderTeamCount: reassignedLeaderTeamIds.length,
    },
  });
});

module.exports = {
  listUsers,
  updateUserStatus,
  issueUserWarning,
  suspendUser,
  unsuspendUser,
  deactivateUser,
  reactivateUser,
  removeUserByAdmin,
  listModerationAuditLogs,
  getCommandCenterOverview,
  listTeams,
  listHackathons,
  listEvents,
  removeTeamMemberByAdmin,
};
