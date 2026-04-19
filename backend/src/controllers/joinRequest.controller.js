const JoinRequest = require("../models/JoinRequest");
const Team = require("../models/Team");
const User = require("../models/User");
const OnboardingProgress = require("../models/OnboardingProgress");
const asyncHandler = require("../utils/asyncHandler");
const {
  GLOBAL_ROLES,
  JOIN_REQUEST_STATUSES,
  JOIN_REQUEST_TRIAGE_STAGES,
  NOTIFICATION_TYPES,
  TEAM_MEMBER_ROLES,
} = require("../utils/constants");
const { createNotification } = require("../services/notification.service");

const REJECTION_REASON_TEMPLATES = [
  { key: "skills_mismatch", label: "Skills currently do not match sprint needs" },
  { key: "capacity_full", label: "Team capacity is full for now" },
  { key: "availability_conflict", label: "Availability does not match delivery timeline" },
  { key: "scope_mismatch", label: "Project scope alignment is weak" },
  { key: "other", label: "Other" },
];

const calculateProfileStrength = (candidate) => {
  let score = 0;

  if (candidate?.headline) {
    score += 20;
  }

  if (candidate?.bio) {
    score += 20;
  }

  const skillCount = Array.isArray(candidate?.skills) ? candidate.skills.length : 0;
  score += Math.min(skillCount * 10, 40);

  const socialLinks = candidate?.socialLinks || {};
  const linkCount = [socialLinks.github, socialLinks.linkedin, socialLinks.website].filter(Boolean).length;
  score += Math.min(linkCount * 10, 20);

  return Math.min(score, 100);
};

const touchTeamActivity = async (teamId) => {
  await Team.updateOne({ _id: teamId }, { $set: { "health.lastActivityAt": new Date() } });
};

const canReviewTeamRequests = (team, user) => {
  if (user.role === GLOBAL_ROLES.ADMIN) {
    return true;
  }

  const creatorId = team.createdBy ? team.createdBy.toString() : team.leader.toString();
  const isCreator = creatorId === user.id;
  const isLeader = team.leader?.toString() === user.id;

  return isCreator || isLeader;
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
    triageStage: JOIN_REQUEST_TRIAGE_STAGES.NEW,
  });

  await touchTeamActivity(team._id);

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
    .populate("user", "name email username status skills headline bio socialLinks availabilityProfile")
    .sort({ createdAt: -1 });

  const requestsWithSignals = requests.map((request) => ({
    ...request.toObject(),
    triageMeta: {
      profileStrengthScore: calculateProfileStrength(request.user),
      skillCount: Array.isArray(request.user?.skills) ? request.user.skills.length : 0,
      timezone: request.user?.availabilityProfile?.timezone || "",
    },
  }));

  return res.json({
    requests: requestsWithSignals,
    reasonTemplates: REJECTION_REASON_TEMPLATES,
  });
});

const reviewJoinRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, note, reasonTemplate } = req.body;

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

  if (decision === "shortlist" || decision === "interview") {
    joinRequest.triageStage =
      decision === "shortlist"
        ? JOIN_REQUEST_TRIAGE_STAGES.SHORTLISTED
        : JOIN_REQUEST_TRIAGE_STAGES.INTERVIEW;
    joinRequest.triageNote = note || "";
    joinRequest.triagedBy = req.user.id;
    joinRequest.triagedAt = new Date();
    await joinRequest.save();
    await touchTeamActivity(team._id);

    await createNotification({
      user: joinRequest.user._id,
      type: NOTIFICATION_TYPES.TEAM_UPDATE,
      message:
        decision === "shortlist"
          ? `You were shortlisted by ${team.name}.`
          : `You were moved to interview stage by ${team.name}.`,
      data: { teamId: team._id, joinRequestId: joinRequest._id },
    });

    return res.json({
      message: `Join request moved to ${decision} stage.`,
      joinRequest,
    });
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
    joinRequest.triageStage = JOIN_REQUEST_TRIAGE_STAGES.APPROVED;
    joinRequest.triageNote = note || joinRequest.triageNote;
    joinRequest.triagedBy = req.user.id;
    joinRequest.triagedAt = new Date();

    await OnboardingProgress.findOneAndUpdate(
      { team: team._id, user: joinRequest.user._id },
      {
        $setOnInsert: {
          team: team._id,
          user: joinRequest.user._id,
          createdBy: req.user.id,
        },
      },
      { upsert: true }
    );

    await createNotification({
      user: joinRequest.user._id,
      type: NOTIFICATION_TYPES.JOIN_APPROVED,
      message: `Your request to join ${team.name} was approved.`,
      data: { teamId: team._id, joinRequestId: joinRequest._id },
    });
  } else {
    joinRequest.status = JOIN_REQUEST_STATUSES.REJECTED;
    joinRequest.triageStage = JOIN_REQUEST_TRIAGE_STAGES.REJECTED;
    joinRequest.triageNote = note || joinRequest.triageNote;
    joinRequest.triageReasonTemplate = reasonTemplate || joinRequest.triageReasonTemplate;
    joinRequest.triagedBy = req.user.id;
    joinRequest.triagedAt = new Date();

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
  await touchTeamActivity(team._id);

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

const cancelMyJoinRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const joinRequest = await JoinRequest.findById(id).populate("team", "name leader");

  if (!joinRequest) {
    return res.status(404).json({ message: "Join request not found." });
  }

  if (joinRequest.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized to cancel this join request." });
  }

  if (joinRequest.status !== JOIN_REQUEST_STATUSES.PENDING) {
    return res.status(400).json({ message: "Only pending requests can be cancelled." });
  }

  joinRequest.status = JOIN_REQUEST_STATUSES.CANCELLED;
  joinRequest.reviewedBy = req.user.id;
  joinRequest.reviewedAt = new Date();
  await joinRequest.save();
  await touchTeamActivity(joinRequest.team._id);

  if (joinRequest.team?.leader && joinRequest.team.leader.toString() !== req.user.id) {
    await createNotification({
      user: joinRequest.team.leader,
      type: NOTIFICATION_TYPES.SYSTEM,
      message: `A join request for ${joinRequest.team.name} was cancelled by the requester.`,
      data: { teamId: joinRequest.team._id, joinRequestId: joinRequest._id },
    });
  }

  return res.json({
    message: "Join request cancelled successfully.",
    joinRequest,
  });
});

module.exports = {
  createJoinRequestByCode,
  listPendingRequestsForTeam,
  reviewJoinRequest,
  listMyJoinRequests,
  cancelMyJoinRequest,
};
