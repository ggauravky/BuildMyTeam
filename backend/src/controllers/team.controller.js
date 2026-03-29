const mongoose = require("mongoose");
const QRCode = require("qrcode");
const Team = require("../models/Team");
const User = require("../models/User");
const Hackathon = require("../models/Hackathon");
const JoinRequest = require("../models/JoinRequest");
const asyncHandler = require("../utils/asyncHandler");
const { generateUniqueJoinCode } = require("../utils/generateJoinCode");
const { GLOBAL_ROLES, NOTIFICATION_TYPES, TEAM_MEMBER_ROLES } = require("../utils/constants");
const { createBulkNotifications, createNotification } = require("../services/notification.service");
const { clientUrl } = require("../config/env");

const normalizePaging = (pageInput, limitInput) => {
  const page = Math.max(1, Number.parseInt(pageInput || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitInput || "20", 10) || 20));
  return { page, limit };
};

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

  return resolveCreatorId(team) === user.id;
};

const hasMemberAccess = (team, user) => {
  if (user.role === GLOBAL_ROLES.ADMIN) {
    return true;
  }

  return team.members.some((entry) => entry.user.toString() === user.id);
};

const populateTeamQuery = (query) =>
  query
    .populate("leader", "name email")
    .populate("members.user", "name email status")
    .populate("hackathon", "title date link");

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

const applyTeamFieldUpdates = (team, payload) => {
  const {
    name,
    hackathonLink,
    projectName,
    githubLink,
    excalidrawLink,
    whatsappLink,
    maxSize,
  } = payload;

  if (name) team.name = name;
  if (hackathonLink) team.hackathonLink = hackathonLink;
  if (projectName) team.projectName = projectName;
  if (typeof maxSize === "number") team.maxSize = maxSize;
  if (githubLink) team.links.github = githubLink;
  if (excalidrawLink) team.links.excalidraw = excalidrawLink;
  if (whatsappLink) team.links.whatsapp = whatsappLink;
};

const createTeam = asyncHandler(async (req, res) => {
  const {
    name,
    hackathonId,
    hackathonLink,
    projectName,
    githubLink,
    excalidrawLink,
    whatsappLink,
    maxSize,
  } = req.body;

  let hackathon = null;
  if (hackathonId) {
    if (!mongoose.Types.ObjectId.isValid(hackathonId)) {
      return res.status(400).json({ message: "Invalid hackathon id." });
    }

    hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ message: "Selected hackathon not found." });
    }
  }

  const joinCode = await generateUniqueJoinCode();

  const team = await Team.create({
    name,
    hackathon: hackathon ? hackathon._id : null,
    hackathonLink,
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
  const { page, limit } = normalizePaging(req.query.page, req.query.limit);
  const skip = (page - 1) * limit;

  const filter = {};

  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ name: regex }, { projectName: regex }];
  }

  if (hackathon) {
    const hackathonRegex = new RegExp(hackathon, "i");

    if (mongoose.Types.ObjectId.isValid(hackathon)) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [{ hackathon }, { hackathonLink: hackathonRegex }],
        },
      ];
    } else {
      filter.hackathonLink = hackathonRegex;
    }
  }

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

  return res.json({ team });
});

const updateTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    hackathonId,
    maxSize,
  } = req.body;

  const team = await Team.findById(id);

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

  const hackathonUpdate = await resolveHackathonForUpdate(hackathonId);

  if (hackathonUpdate.error) {
    return res.status(hackathonUpdate.statusCode).json({ message: hackathonUpdate.error });
  }

  if (hackathonUpdate.shouldUpdate) {
    team.hackathon = hackathonUpdate.value;
  }

  applyTeamFieldUpdates(team, req.body);

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
  updateTeam,
  removeMember,
  transferLeader,
  getTeamJoinQr,
  deleteTeam,
};
