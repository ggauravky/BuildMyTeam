const mongoose = require("mongoose");
const QRCode = require("qrcode");
const Team = require("../models/Team");
const User = require("../models/User");
const Hackathon = require("../models/Hackathon");
const Event = require("../models/Event");
const JoinRequest = require("../models/JoinRequest");
const Task = require("../models/Task");
const OnboardingProgress = require("../models/OnboardingProgress");
const DecisionLog = require("../models/DecisionLog");
const OwnershipLedger = require("../models/OwnershipLedger");
const asyncHandler = require("../utils/asyncHandler");
const { generateUniqueJoinCode } = require("../utils/generateJoinCode");
const {
  GLOBAL_ROLES,
  NOTIFICATION_TYPES,
  TEAM_HEALTH_RISK_LEVELS,
  TEAM_MEMBER_ROLES,
  TEAM_TRACK_TYPES,
} = require("../utils/constants");
const { createBulkNotifications, createNotification } = require("../services/notification.service");
const { clientUrl } = require("../config/env");

const normalizePaging = (pageInput, limitInput) => {
  const page = Math.max(1, Number.parseInt(pageInput || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitInput || "20", 10) || 20));
  return { page, limit };
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeQueryInput = (value) => (typeof value === "string" ? value.trim() : "");
const escapeRegex = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\\$&`);

const resolveCreatorId = (team) => {
  if (team.createdBy) {
    return team.createdBy.toString();
  }

  return team.leader ? team.leader.toString() : "";
};

const hasCreatorAccess = (team, user) => {
  if (user.role === GLOBAL_ROLES.ADMIN) {
    return true;
  }

  const creatorId = resolveCreatorId(team);
  const leaderId = team?.leader?.toString ? team.leader.toString() : "";

  return creatorId === user.id || leaderId === user.id;
};

const hasMemberAccess = (team, user) => {
  if (user.role === GLOBAL_ROLES.ADMIN) {
    return true;
  }

  return team.members.some((entry) => {
    const memberUserId =
      entry.user && typeof entry.user === "object" && entry.user._id
        ? entry.user._id.toString()
        : entry.user?.toString();

    return memberUserId === user.id;
  });
};

const populateTeamQuery = (query) =>
  query
    .populate("leader", "name email")
    .populate("members.user", "name email username status")
    .populate("hackathon", "title date link")
    .populate("event", "title date link");

const markTeamActivity = (team) => {
  if (!team.health) {
    team.health = {};
  }

  team.health.lastActivityAt = new Date();
};

const resolveRiskLevel = ({ progressPercent, blockers, inactiveDays, checklistCompletionPercent, checkInAgeDays }) => {
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

  if (checkInAgeDays !== null && checkInAgeDays >= 7) {
    score += 1;
  }

  if (score >= 5) {
    return TEAM_HEALTH_RISK_LEVELS.AT_RISK;
  }

  if (score >= 3) {
    return TEAM_HEALTH_RISK_LEVELS.WATCH;
  }

  return TEAM_HEALTH_RISK_LEVELS.ON_TRACK;
};

const buildTeamHealthSnapshot = (team) => {
  const health = team.health || {};
  const checklist = health.checklist || [];
  const completedCount = checklist.filter((item) => item.completed).length;
  const checklistCompletionPercent = checklist.length
    ? Math.round((completedCount / checklist.length) * 100)
    : 0;

  const now = Date.now();
  const lastActivityAt = health.lastActivityAt || team.updatedAt || team.createdAt || new Date();
  const lastCheckInAt = health.lastCheckInAt || null;

  const inactiveDays = Math.max(
    0,
    Math.floor((now - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  const checkInAgeDays = lastCheckInAt
    ? Math.max(0, Math.floor((now - new Date(lastCheckInAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const blockers = String(health.blockers || "").trim();
  const progressPercent = Number(health.progressPercent || 0);

  return {
    progressPercent,
    checklist,
    completedChecklistCount: completedCount,
    checklistCompletionPercent,
    blockers,
    notes: health.notes || "",
    lastCheckInAt,
    lastActivityAt,
    inactiveDays,
    checkInAgeDays,
    riskLevel: resolveRiskLevel({
      progressPercent,
      blockers,
      inactiveDays,
      checklistCompletionPercent,
      checkInAgeDays,
    }),
  };
};

const buildActivityHint = (inactiveDays) => {
  if (inactiveDays <= 1) {
    return "Active within the last day";
  }

  if (inactiveDays <= 3) {
    return `Active ${inactiveDays} days ago`;
  }

  if (inactiveDays <= 7) {
    return `Low activity for ${inactiveDays} days`;
  }

  return `Dormant for ${inactiveDays} days`;
};

const buildDiscoveryMetadata = (team) => {
  const healthSnapshot = buildTeamHealthSnapshot(team);
  const totalSeats = Number(team.maxSize || 0);
  const filledSeats = Array.isArray(team.members) ? team.members.length : 0;
  const seatsOpen = Math.max(totalSeats - filledSeats, 0);
  const isFull = seatsOpen === 0;

  let score = 50;

  if (isFull) {
    score -= 30;
  } else {
    score += clampNumber(seatsOpen * 6, 6, 24);
  }

  if (healthSnapshot.riskLevel === TEAM_HEALTH_RISK_LEVELS.ON_TRACK) {
    score += 14;
  } else if (healthSnapshot.riskLevel === TEAM_HEALTH_RISK_LEVELS.WATCH) {
    score += 6;
  } else {
    score -= 8;
  }

  if (healthSnapshot.inactiveDays <= 1) {
    score += 12;
  } else if (healthSnapshot.inactiveDays <= 3) {
    score += 8;
  } else if (healthSnapshot.inactiveDays <= 7) {
    score += 3;
  } else {
    score -= 6;
  }

  const hasCoreLinks = Boolean(team?.links?.github && team?.links?.excalidraw && team?.links?.whatsapp);
  if (hasCoreLinks) {
    score += 4;
  }

  const compatibilityHints = [
    isFull ? "Team is currently full" : `${seatsOpen} seat${seatsOpen > 1 ? "s" : ""} open`,
    buildActivityHint(healthSnapshot.inactiveDays),
    healthSnapshot.riskLevel === TEAM_HEALTH_RISK_LEVELS.AT_RISK
      ? "Execution risk is high, expect structured catch-up"
      : "Momentum and execution health look stable",
    team.trackType === TEAM_TRACK_TYPES.EVENT
      ? "Event-focused collaboration flow"
      : "Hackathon sprint-focused collaboration flow",
  ];

  return {
    score: clampNumber(Math.round(score), 0, 100),
    seatsOpen,
    isFull,
    riskLevel: healthSnapshot.riskLevel,
    lastActivityAt: healthSnapshot.lastActivityAt,
    compatibilityHints,
  };
};

const resolveHackathonForUpdate = async (hackathonId) => {
  if (hackathonId === undefined) {
    return { shouldUpdate: false };
  }

  if (hackathonId === null) {
    return { shouldUpdate: true, value: null };
  }

  if (!mongoose.Types.ObjectId.isValid(hackathonId)) {
    return {
      shouldUpdate: true,
      error: "Invalid hackathon id.",
      statusCode: 400,
    };
  }

  const hackathon = await Hackathon.findById(hackathonId);

  if (!hackathon) {
    return {
      shouldUpdate: true,
      error: "Selected hackathon not found.",
      statusCode: 404,
    };
  }

  return { shouldUpdate: true, value: hackathon._id };
};

const resolveEventForUpdate = async (eventId) => {
  if (eventId === undefined) {
    return { shouldUpdate: false };
  }

  if (eventId === null) {
    return { shouldUpdate: true, value: null };
  }

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return {
      shouldUpdate: true,
      error: "Invalid event id.",
      statusCode: 400,
    };
  }

  const event = await Event.findById(eventId);

  if (!event) {
    return {
      shouldUpdate: true,
      error: "Selected event not found.",
      statusCode: 404,
    };
  }

  return { shouldUpdate: true, value: event._id };
};

const applyTeamFieldUpdates = (team, payload) => {
  const {
    name,
    hackathonLink,
    eventLink,
    projectName,
    githubLink,
    excalidrawLink,
    whatsappLink,
    maxSize,
  } = payload;

  if (name !== undefined) team.name = name;
  if (hackathonLink !== undefined) team.hackathonLink = hackathonLink;
  if (eventLink !== undefined) team.eventLink = eventLink;
  if (projectName !== undefined) team.projectName = projectName;
  if (typeof maxSize === "number") team.maxSize = maxSize;

  if (!team.links) {
    team.links = {};
  }

  if (githubLink !== undefined) team.links.github = githubLink;
  if (excalidrawLink !== undefined) team.links.excalidraw = excalidrawLink;
  if (whatsappLink !== undefined) team.links.whatsapp = whatsappLink;
};

const resolveMemberUserId = (member) => {
  if (!member?.user) {
    return "";
  }

  if (typeof member.user === "string") {
    return member.user;
  }

  if (typeof member.user.toString === "function") {
    return member.user._id ? member.user._id.toString() : member.user.toString();
  }

  return "";
};

const resolveMemberContactLinks = (profileDoc) => {
  const socialLinks = profileDoc?.socialLinks?.toObject
    ? profileDoc.socialLinks.toObject()
    : profileDoc?.socialLinks || {};

  return {
    github: socialLinks.github || "",
    linkedin: socialLinks.linkedin || "",
    website: socialLinks.website || "",
  };
};

const buildTeamWorkspaceResponse = ({ team, profileMapByUserId, canViewMemberEmail, viewer }) => {
  const teamObject = team.toObject();

  teamObject.members = team.members.map((member) => {
    const memberId = resolveMemberUserId(member);
    const memberUser = member.user && typeof member.user === "object" ? member.user : null;
    const profileDoc = profileMapByUserId.get(memberId);

    const userPayload = {
      _id: memberId,
      name: memberUser?.name || "Unknown User",
      username: profileDoc?.username || memberUser?.username || "",
      status: memberUser?.status || "",
    };

    if (canViewMemberEmail) {
      userPayload.email = memberUser?.email || "";
    }

    return {
      ...member.toObject(),
      user: userPayload,
      contactLinks: resolveMemberContactLinks(profileDoc),
    };
  });

  const viewerMembership = team.members.find((entry) => resolveMemberUserId(entry) === viewer.id);

  return {
    team: teamObject,
    permissions: {
      canManage: hasCreatorAccess(team, viewer),
      canViewMemberEmail,
      viewerRole:
        viewer.role === GLOBAL_ROLES.ADMIN
          ? GLOBAL_ROLES.ADMIN
          : viewerMembership?.role || TEAM_MEMBER_ROLES.MEMBER,
    },
  };
};

const createTeam = asyncHandler(async (req, res) => {
  const {
    name,
    targetType = TEAM_TRACK_TYPES.HACKATHON,
    hackathonId,
    eventId,
    hackathonLink,
    eventLink,
    projectName,
    githubLink,
    excalidrawLink,
    whatsappLink,
    maxSize,
  } = req.body;

  let hackathon = null;
  let event = null;

  if (targetType === TEAM_TRACK_TYPES.HACKATHON) {
    if (hackathonId) {
      if (!mongoose.Types.ObjectId.isValid(hackathonId)) {
        return res.status(400).json({ message: "Invalid hackathon id." });
      }

      hackathon = await Hackathon.findById(hackathonId);
      if (!hackathon) {
        return res.status(404).json({ message: "Selected hackathon not found." });
      }
    }
  } else {
    if (eventId) {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ message: "Invalid event id." });
      }

      event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Selected event not found." });
      }
    }
  }

  const joinCode = await generateUniqueJoinCode();

  const team = await Team.create({
    name,
    trackType: targetType,
    hackathon: hackathon ? hackathon._id : null,
    event: event ? event._id : null,
    hackathonLink:
      targetType === TEAM_TRACK_TYPES.HACKATHON
        ? (hackathon?.link || hackathonLink || "")
        : "",
    eventLink:
      targetType === TEAM_TRACK_TYPES.EVENT
        ? (event?.link || eventLink || "")
        : "",
    projectName,
    links: {
      github: githubLink,
      excalidraw: excalidrawLink,
      whatsapp: whatsappLink,
    },
    maxSize,
    joinCode,
    leader: req.user.id,
    createdBy: req.user.id,
    members: [
      {
        user: req.user.id,
        role: TEAM_MEMBER_ROLES.LEADER,
      },
    ],
  });

  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { teams: team._id },
  });

  const populatedTeam = await populateTeamQuery(Team.findById(team._id));

  return res.status(201).json({
    message: "Team created successfully.",
    team: populatedTeam,
  });
});

const listTeams = asyncHandler(async (req, res) => {
  const { search = "", hackathon = "" } = req.query;
  const normalizedSearch = normalizeQueryInput(search);
  const normalizedHackathon = normalizeQueryInput(hackathon);
  const normalizedTrackType = normalizeQueryInput(req.query.trackType);
  const normalizedEvent = normalizeQueryInput(req.query.event);
  const { page, limit } = normalizePaging(req.query.page, req.query.limit);
  const skip = (page - 1) * limit;

  const filter = {};

  if (
    normalizedTrackType === TEAM_TRACK_TYPES.HACKATHON ||
    normalizedTrackType === TEAM_TRACK_TYPES.EVENT
  ) {
    filter.trackType = normalizedTrackType;
  }

  if (normalizedSearch) {
    const regex = new RegExp(escapeRegex(normalizedSearch), "i");
    filter.$or = [{ name: regex }, { projectName: regex }];
  }

  if (normalizedHackathon) {
    const hackathonRegex = new RegExp(escapeRegex(normalizedHackathon), "i");

    if (mongoose.Types.ObjectId.isValid(normalizedHackathon)) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [{ hackathon: normalizedHackathon }, { hackathonLink: hackathonRegex }],
        },
      ];
    } else {
      filter.hackathonLink = hackathonRegex;
    }
  }

  if (normalizedEvent) {
    const eventRegex = new RegExp(escapeRegex(normalizedEvent), "i");

    if (mongoose.Types.ObjectId.isValid(normalizedEvent)) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [{ event: normalizedEvent }, { eventLink: eventRegex }],
        },
      ];
    } else {
      filter.eventLink = eventRegex;
    }
  }

  const [teams, total] = await Promise.all([
    populateTeamQuery(Team.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Team.countDocuments(filter),
  ]);

  const rankedTeams = teams
    .map((team) => {
      const teamObject = team.toObject();

      return {
        ...teamObject,
        discoveryMeta: buildDiscoveryMetadata(team),
      };
    })
    .sort((teamA, teamB) => {
      if (teamB.discoveryMeta.score !== teamA.discoveryMeta.score) {
        return teamB.discoveryMeta.score - teamA.discoveryMeta.score;
      }

      return new Date(teamB.createdAt).getTime() - new Date(teamA.createdAt).getTime();
    })
    .map((team, index) => ({
      ...team,
      discoveryMeta: {
        ...team.discoveryMeta,
        rank: skip + index + 1,
      },
    }));

  return res.json({
    teams: rankedTeams,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const listMyTeams = asyncHandler(async (req, res) => {
  const { page, limit } = normalizePaging(req.query.page, req.query.limit);
  const skip = (page - 1) * limit;
  const filter = { "members.user": req.user.id };

  const [teams, total] = await Promise.all([
    populateTeamQuery(Team.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Team.countDocuments(filter),
  ]);

  return res.json({
    teams,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const getTeamById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const team = await populateTeamQuery(Team.findById(id));

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  const teamObject = team.toObject();

  teamObject.members = teamObject.members.map((member) => {
    if (!member.user || typeof member.user !== "object") {
      return member;
    }

    return {
      ...member,
      user: {
        _id: member.user._id,
        name: member.user.name,
        username: member.user.username || "",
      },
    };
  });

  return res.json({ team: teamObject });
});

const getTeamWorkspaceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const team = await populateTeamQuery(Team.findById(req.team?._id || id));

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!hasMemberAccess(team, req.user)) {
    return res.status(403).json({ message: "Only team members or admin can access this workspace." });
  }

  const creatorId = resolveCreatorId(team);
  const canViewMemberEmail = req.user.role === GLOBAL_ROLES.ADMIN || creatorId === req.user.id;
  const memberIds = team.members.map((member) => resolveMemberUserId(member)).filter(Boolean);
  const memberProfiles = await User.find({ _id: { $in: memberIds } }).select("username socialLinks");
  const profileMapByUserId = new Map(
    memberProfiles.map((profile) => [profile._id.toString(), profile])
  );

  return res.json(
    buildTeamWorkspaceResponse({
      team,
      profileMapByUserId,
      canViewMemberEmail,
      viewer: req.user,
    })
  );
});

const updateTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    targetType,
    hackathonId,
    eventId,
    maxSize,
  } = req.body;

  const team = req.team || (await Team.findById(id));

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!hasCreatorAccess(team, req.user)) {
    return res.status(403).json({ message: "Only the team creator or admin can update this team." });
  }

  if (typeof maxSize === "number" && maxSize < team.members.length) {
    return res.status(400).json({
      message: "Max size cannot be lower than current member count.",
    });
  }

  if (
    targetType !== undefined &&
    targetType !== TEAM_TRACK_TYPES.HACKATHON &&
    targetType !== TEAM_TRACK_TYPES.EVENT
  ) {
    return res.status(400).json({ message: "Invalid target type." });
  }

  const hackathonUpdate = await resolveHackathonForUpdate(hackathonId);
  const eventUpdate = await resolveEventForUpdate(eventId);

  if (hackathonUpdate.error) {
    return res.status(hackathonUpdate.statusCode).json({ message: hackathonUpdate.error });
  }

  if (eventUpdate.error) {
    return res.status(eventUpdate.statusCode).json({ message: eventUpdate.error });
  }

  if (targetType) {
    team.trackType = targetType;
  }

  if (hackathonUpdate.shouldUpdate) {
    team.hackathon = hackathonUpdate.value;
  }

  if (eventUpdate.shouldUpdate) {
    team.event = eventUpdate.value;
  }

  applyTeamFieldUpdates(team, req.body);

  const nextTrackType = team.trackType;

  if (nextTrackType === TEAM_TRACK_TYPES.HACKATHON) {
    if (team.hackathon && !team.hackathonLink) {
      const linkedHackathon = await Hackathon.findById(team.hackathon).select("link");
      team.hackathonLink = linkedHackathon?.link || team.hackathonLink;
    }

    if (!team.hackathonLink) {
      return res.status(400).json({ message: "Hackathon link is required for hackathon teams." });
    }

    team.event = null;
    team.eventLink = "";
  }

  if (nextTrackType === TEAM_TRACK_TYPES.EVENT) {
    if (team.event && !team.eventLink) {
      const linkedEvent = await Event.findById(team.event).select("link");
      team.eventLink = linkedEvent?.link || team.eventLink;
    }

    if (!team.eventLink) {
      return res.status(400).json({ message: "Event link is required for event teams." });
    }

    team.hackathon = null;
    team.hackathonLink = "";
  }

  markTeamActivity(team);

  await team.save();

  const recipientIds = team.members
    .map((member) => member.user.toString())
    .filter((idValue) => idValue !== req.user.id);

  await createBulkNotifications(
    recipientIds.map((user) => ({
      user,
      type: NOTIFICATION_TYPES.TEAM_UPDATE,
      message: `Team ${team.name} details were updated.`,
      data: { teamId: team._id },
    }))
  );

  const populatedTeam = await populateTeamQuery(Team.findById(team._id));

  return res.json({
    message: "Team updated successfully.",
    team: populatedTeam,
  });
});

const removeMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const team = await Team.findById(id);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!hasCreatorAccess(team, req.user)) {
    return res.status(403).json({ message: "Only the team creator or admin can remove members." });
  }

  if (team.leader.toString() === userId) {
    return res.status(400).json({ message: "Transfer team leadership before removing the leader." });
  }

  const isMember = team.members.some((entry) => entry.user.toString() === userId);

  if (!isMember) {
    return res.status(404).json({ message: "Member not found in team." });
  }

  team.members = team.members.filter((entry) => entry.user.toString() !== userId);
  markTeamActivity(team);
  await team.save();

  await User.findByIdAndUpdate(userId, {
    $pull: { teams: team._id },
  });

  await createNotification({
    user: userId,
    type: NOTIFICATION_TYPES.TEAM_UPDATE,
    message: `You were removed from team ${team.name}.`,
    data: { teamId: team._id },
  });

  return res.json({ message: "Member removed successfully." });
});

const transferLeader = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newLeaderId } = req.body;

  const team = await Team.findById(id);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!hasCreatorAccess(team, req.user)) {
    return res.status(403).json({ message: "Only the team creator or admin can transfer leadership." });
  }

  const newLeader = team.members.find((entry) => entry.user.toString() === newLeaderId);

  if (!newLeader) {
    return res.status(400).json({ message: "New leader must be an existing team member." });
  }

  const currentLeader = team.members.find((entry) => entry.user.toString() === team.leader.toString());
  if (currentLeader) {
    currentLeader.role = TEAM_MEMBER_ROLES.MEMBER;
  }

  newLeader.role = TEAM_MEMBER_ROLES.LEADER;
  team.leader = newLeaderId;
  markTeamActivity(team);

  await team.save();

  await createBulkNotifications(
    team.members.map((entry) => ({
      user: entry.user,
      type: NOTIFICATION_TYPES.TEAM_UPDATE,
      message: `Leadership for team ${team.name} has been updated.`,
      data: { teamId: team._id, newLeaderId },
    }))
  );

  const populatedTeam = await populateTeamQuery(Team.findById(team._id));

  return res.json({
    message: "Team leadership transferred successfully.",
    team: populatedTeam,
  });
});

const getTeamJoinQr = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const team = await Team.findById(id);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!hasMemberAccess(team, req.user)) {
    return res.status(403).json({ message: "Only team members or admin can generate team QR." });
  }

  const joinUrl = `${clientUrl}/join-team?code=${team.joinCode}`;
  const qrCodeDataUrl = await QRCode.toDataURL(joinUrl);

  return res.json({
    joinCode: team.joinCode,
    joinUrl,
    qrCodeDataUrl,
  });
});

const getTeamHealth = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const team = await Team.findById(id);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!hasMemberAccess(team, req.user)) {
    return res.status(403).json({ message: "Only team members or admin can view team health." });
  }

  return res.json({
    teamId: team._id,
    health: buildTeamHealthSnapshot(team),
  });
});

const updateTeamHealth = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { progressPercent, checklist, blockers, notes, checkInNow } = req.body;

  const team = await Team.findById(id);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!hasCreatorAccess(team, req.user)) {
    return res.status(403).json({ message: "Only the team creator or admin can update team health." });
  }

  if (!team.health) {
    team.health = {};
  }

  if (progressPercent !== undefined) {
    team.health.progressPercent = progressPercent;
  }

  if (checklist !== undefined) {
    team.health.checklist = checklist;
  }

  if (blockers !== undefined) {
    team.health.blockers = blockers;
  }

  if (notes !== undefined) {
    team.health.notes = notes;
  }

  if (checkInNow) {
    team.health.lastCheckInAt = new Date();
  }

  markTeamActivity(team);
  await team.save();

  const recipientIds = team.members
    .map((member) => member.user.toString())
    .filter((idValue) => idValue !== req.user.id);

  await createBulkNotifications(
    recipientIds.map((user) => ({
      user,
      type: NOTIFICATION_TYPES.TEAM_UPDATE,
      message: `Team health for ${team.name} was updated.`,
      data: { teamId: team._id },
    }))
  );

  return res.json({
    message: "Team health updated successfully.",
    teamId: team._id,
    health: buildTeamHealthSnapshot(team),
  });
});

const deleteTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const team = await Team.findById(id);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!hasCreatorAccess(team, req.user)) {
    return res.status(403).json({ message: "Only the team creator or admin can delete this team." });
  }

  const memberIds = team.members.map((member) => member.user);

  await Promise.all([
    Team.deleteOne({ _id: team._id }),
    JoinRequest.deleteMany({ team: team._id }),
    Task.deleteMany({ team: team._id }),
    OnboardingProgress.deleteMany({ team: team._id }),
    DecisionLog.deleteMany({ team: team._id }),
    OwnershipLedger.deleteMany({ team: team._id }),
    User.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { teams: team._id } }
    ),
  ]);

  return res.json({ message: "Team deleted successfully." });
});

module.exports = {
  createTeam,
  listTeams,
  listMyTeams,
  getTeamById,
  getTeamWorkspaceById,
  updateTeam,
  removeMember,
  transferLeader,
  getTeamJoinQr,
  getTeamHealth,
  updateTeamHealth,
  deleteTeam,
};
