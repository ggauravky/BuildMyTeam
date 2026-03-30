const JoinRequest = require("../models/JoinRequest");
const Team = require("../models/Team");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const {
  GLOBAL_ROLES,
  JOIN_REQUEST_STATUSES,
  NOTIFICATION_TYPES,
  TEAM_MEMBER_ROLES,
} = require("../utils/constants");
const { createNotification } = require("../services/notification.service");

const canReviewTeamRequests = (team, user) => {
  if (user.role === GLOBAL_ROLES.ADMIN) {
    return true;
  }

  const creatorId = team.createdBy ? team.createdBy.toString() : team.leader.toString();
  return creatorId === user.id;
};

const createJoinRequestByCode = asyncHandler(async (req, res) => {
  const code = req.body.code.trim().toUpperCase();
  const team = await Team.findOne({ joinCode: code });

  if (!team) {
    return res.status(404).json({ message: "No team found for the provided join code." });
  }

  const isAlreadyMember = team.members.some((entry) => entry.user.toString() === req.user.id);

  if (isAlreadyMember) {
    return res.status(400).json({ message: "You are already a member of this team." });
  }

  if (team.members.length >= team.maxSize) {
    return res.status(400).json({ message: "This team is already full." });
  }

  const existingPendingRequest = await JoinRequest.findOne({
    user: req.user.id,
    team: team._id,
    status: JOIN_REQUEST_STATUSES.PENDING,
  });

  if (existingPendingRequest) {
    return res.status(409).json({ message: "You already have a pending request for this team." });
  }

  const joinRequest = await JoinRequest.create({
    user: req.user.id,
    team: team._id,
    status: JOIN_REQUEST_STATUSES.PENDING,
  });

  await createNotification({
    user: team.leader,
    type: NOTIFICATION_TYPES.JOIN_REQUEST,
    message: `New join request received for team ${team.name}.`,
    data: {
      teamId: team._id,
      joinRequestId: joinRequest._id,
      requesterId: req.user.id,
    },
  });

  return res.status(201).json({
    message: "Join request submitted successfully.",
    joinRequest,
  });
});

const listPendingRequestsForTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const team = await Team.findById(teamId);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!canReviewTeamRequests(team, req.user)) {
    return res.status(403).json({ message: "Not authorized to view requests for this team." });
  }

  const requests = await JoinRequest.find({
    team: teamId,
    status: JOIN_REQUEST_STATUSES.PENDING,
  })
    .populate("user", "name email status")
    .sort({ createdAt: -1 });

  return res.json({ requests });
});

const reviewJoinRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body;

  const joinRequest = await JoinRequest.findById(id)
    .populate("user", "name email")
    .populate("team");

  if (!joinRequest) {
    return res.status(404).json({ message: "Join request not found." });
  }

  if (joinRequest.status !== JOIN_REQUEST_STATUSES.PENDING) {
    return res.status(400).json({ message: "This join request has already been reviewed." });
  }

  const team = await Team.findById(joinRequest.team._id);

  if (!team) {
    return res.status(404).json({ message: "Associated team no longer exists." });
  }

  if (!canReviewTeamRequests(team, req.user)) {
    return res.status(403).json({ message: "Not authorized to review requests for this team." });
  }

  if (decision === "approve") {
    const membershipUpdate = await Team.updateOne(
      {
        _id: team._id,
        "members.user": { $ne: joinRequest.user._id },
        $expr: { $lt: [{ $size: "$members" }, "$maxSize"] },
      },
      {
        $push: {
          members: {
            user: joinRequest.user._id,
            role: TEAM_MEMBER_ROLES.MEMBER,
          },
        },
      }
    );

    if (membershipUpdate.modifiedCount === 0) {
      const latestTeam = await Team.findById(team._id).select("members maxSize");

      if (!latestTeam) {
        return res.status(404).json({ message: "Associated team no longer exists." });
      }

      const isAlreadyMember = latestTeam.members.some(
        (entry) => entry.user.toString() === joinRequest.user._id.toString()
      );

      if (isAlreadyMember) {
        return res.status(400).json({ message: "User is already a member of this team." });
      }

      return res.status(400).json({ message: "Team is already full." });
    }

    await User.findByIdAndUpdate(joinRequest.user._id, {
      $addToSet: { teams: team._id },
    });

    joinRequest.status = JOIN_REQUEST_STATUSES.APPROVED;

    await createNotification({
      user: joinRequest.user._id,
      type: NOTIFICATION_TYPES.JOIN_APPROVED,
      message: `Your request to join ${team.name} was approved.`,
      data: { teamId: team._id, joinRequestId: joinRequest._id },
    });
  } else {
    joinRequest.status = JOIN_REQUEST_STATUSES.REJECTED;

    await createNotification({
      user: joinRequest.user._id,
      type: NOTIFICATION_TYPES.JOIN_REJECTED,
      message: `Your request to join ${team.name} was rejected.`,
      data: { teamId: team._id, joinRequestId: joinRequest._id },
    });
  }

  joinRequest.reviewedBy = req.user.id;
  joinRequest.reviewedAt = new Date();
  await joinRequest.save();

  return res.json({
    message: `Join request ${decision}d successfully.`,
    joinRequest,
  });
});

const listMyJoinRequests = asyncHandler(async (req, res) => {
  const requests = await JoinRequest.find({ user: req.user.id })
    .populate("team", "name projectName joinCode")
    .sort({ createdAt: -1 });

  return res.json({ requests });
});

module.exports = {
  createJoinRequestByCode,
  listPendingRequestsForTeam,
  reviewJoinRequest,
  listMyJoinRequests,
};
