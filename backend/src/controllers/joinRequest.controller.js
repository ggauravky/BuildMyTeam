const JoinRequest = require("../models/JoinRequest");
const Team = require("../models/Team");
const User = require("../models/User");
const OnboardingProgress = require("../models/OnboardingProgress");
const Task = require("../models/Task");
const asyncHandler = require("../utils/asyncHandler");
const {
  GLOBAL_ROLES,
  JOIN_REQUEST_STATUSES,
  JOIN_REQUEST_TRIAGE_STAGES,
  NOTIFICATION_TYPES,
  TASK_STATUSES,
  TEAM_MEMBER_ROLES,
} = require("../utils/constants");
const { createNotification } = require("../services/notification.service");
const { publishTeamWorkspaceEvent } = require("../services/realtime.service");

const ACTIVE_TASK_STATUSES = [TASK_STATUSES.BACKLOG, TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.REVIEW];

const REJECTION_REASON_TEMPLATES = [
  { key: "skills_mismatch", label: "Skills currently do not match sprint needs" },
  { key: "capacity_full", label: "Team capacity is full for now" },
  { key: "availability_conflict", label: "Availability does not match delivery timeline" },
  { key: "scope_mismatch", label: "Project scope alignment is weak" },
  { key: "other", label: "Other" },
];

const normalizeSkill = (value) => String(value || "").trim().toLowerCase();

const toScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const resolveAvailabilitySnapshot = (profile = {}) => {
  const weeklyCapacityHours = Math.max(Number(profile.weeklyCapacityHours || 12), 1);
  const currentLoadHours = Math.max(Number(profile.currentLoadHours || 0), 0);
  const freeHours = Math.max(weeklyCapacityHours - currentLoadHours, 0);
  const freeRatio = freeHours / weeklyCapacityHours;

  return {
    weeklyCapacityHours,
    currentLoadHours,
    freeHours,
    freeRatio,
  };
};

const resolveTimezoneScore = (candidateTimezone, teamTimezone) => {
  const normalizedCandidate = String(candidateTimezone || "").trim();
  const normalizedTeam = String(teamTimezone || "").trim();

  if (!normalizedCandidate || !normalizedTeam) {
    return 50;
  }

  if (normalizedCandidate === normalizedTeam) {
    return 100;
  }

  const candidateRegion = normalizedCandidate.split("/")[0];
  const teamRegion = normalizedTeam.split("/")[0];

  if (candidateRegion && teamRegion && candidateRegion === teamRegion) {
    return 72;
  }

  return 42;
};

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

  publishTeamWorkspaceEvent({
    teamId: team._id,
    type: "join_request_created",
    actorId: req.user.id,
    payload: {
      joinRequestId: joinRequest._id,
      triageStage: joinRequest.triageStage,
    },
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

const listRankedJoinRequestsForTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 25, 100));
  const team = await Team.findById(teamId);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  if (!canReviewTeamRequests(team, req.user)) {
    return res.status(403).json({ message: "Not authorized to view requests for this team." });
  }

  const teamMemberIds = team.members
    .map((member) => member.user?.toString?.() || String(member.user || ""))
    .filter(Boolean);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [requests, teamMembers, activeTasks, completedRecentlyCount] = await Promise.all([
    JoinRequest.find({
      team: teamId,
      status: JOIN_REQUEST_STATUSES.PENDING,
    })
      .populate("user", "name email username status skills headline bio socialLinks availabilityProfile")
      .sort({ createdAt: -1 }),
    User.find({ _id: { $in: teamMemberIds } }).select("skills availabilityProfile"),
    Task.find({
      team: teamId,
      status: { $in: ACTIVE_TASK_STATUSES },
    }).select("tags blockedReason dueDate"),
    Task.countDocuments({
      team: teamId,
      status: TASK_STATUSES.DONE,
      completedAt: { $gte: sevenDaysAgo },
    }),
  ]);

  const taskTagCounts = new Map();
  activeTasks.forEach((task) => {
    (task.tags || []).forEach((tag) => {
      const normalizedTag = normalizeSkill(tag);
      if (!normalizedTag) {
        return;
      }

      taskTagCounts.set(normalizedTag, (taskTagCounts.get(normalizedTag) || 0) + 1);
    });
  });

  const teamSkillCounts = new Map();
  teamMembers.forEach((member) => {
    (member.skills || []).forEach((skill) => {
      const normalizedSkill = normalizeSkill(skill);
      if (!normalizedSkill) {
        return;
      }

      teamSkillCounts.set(normalizedSkill, (teamSkillCounts.get(normalizedSkill) || 0) + 1);
    });
  });

  const targetSkills =
    Array.from((taskTagCounts.size ? taskTagCounts : teamSkillCounts).entries())
      .sort((first, second) => second[1] - first[1])
      .slice(0, 8)
      .map(([skill]) => skill);

  const timezoneFrequency = new Map();
  const teamAvailability = teamMembers.map((member) => resolveAvailabilitySnapshot(member.availabilityProfile));

  teamMembers.forEach((member) => {
    const timezone = String(member.availabilityProfile?.timezone || "UTC").trim();
    timezoneFrequency.set(timezone, (timezoneFrequency.get(timezone) || 0) + 1);
  });

  const majorityTimezone = timezoneFrequency.size
    ? Array.from(timezoneFrequency.entries())
        .sort((first, second) => second[1] - first[1])[0][0]
    : "UTC";

  const averageTeamFreeRatio =
    teamAvailability.length > 0
      ? teamAvailability.reduce((sum, member) => sum + member.freeRatio, 0) / teamAvailability.length
      : 0.5;
  const averageTeamFreeHours =
    teamAvailability.length > 0
      ? teamAvailability.reduce((sum, member) => sum + member.freeHours, 0) / teamAvailability.length
      : 6;

  const now = new Date();
  const overdueTasks = activeTasks.filter(
    (task) => task.dueDate && new Date(task.dueDate).getTime() < now.getTime()
  ).length;
  const blockedTasks = activeTasks.filter((task) => String(task.blockedReason || "").trim()).length;

  const teamMomentumBaseScore = toScore(
    100 - overdueTasks * 14 - blockedTasks * 12 - requests.length * 7 + Math.min(completedRecentlyCount * 6, 24)
  );

  const rankedRequests = requests
    .map((request) => {
      const candidate = request.user || {};
      const candidateSkillSet = new Set((candidate.skills || []).map(normalizeSkill).filter(Boolean));
      const desiredSkills = targetSkills.length
        ? targetSkills
        : Array.from(teamSkillCounts.keys()).slice(0, 8);
      const matchedSkills = desiredSkills.filter((skill) => candidateSkillSet.has(skill));
      const missingSkills = desiredSkills.filter((skill) => !candidateSkillSet.has(skill));

      const skillsCoverageScore = toScore(
        desiredSkills.length
          ? (matchedSkills.length / desiredSkills.length) * 100
          : Math.min(candidateSkillSet.size * 12, 100)
      );

      const candidateAvailability = resolveAvailabilitySnapshot(candidate.availabilityProfile);
      const availabilityFitScore = toScore(
        100 -
          Math.abs(candidateAvailability.freeRatio - averageTeamFreeRatio) * 100 +
          (candidateAvailability.freeHours >= averageTeamFreeHours ? 8 : -6)
      );

      const timezoneFitScore = toScore(
        resolveTimezoneScore(candidate.availabilityProfile?.timezone, majorityTimezone)
      );

      const momentumContributionScore = toScore(
        teamMomentumBaseScore * 0.65 + availabilityFitScore * 0.35
      );

      const overallScore = toScore(
        skillsCoverageScore * 0.45 +
          availabilityFitScore * 0.3 +
          timezoneFitScore * 0.15 +
          momentumContributionScore * 0.1
      );

      return {
        joinRequestId: request._id,
        createdAt: request.createdAt,
        triageStage: request.triageStage,
        candidate: {
          id: candidate._id,
          name: candidate.name,
          email: candidate.email,
          username: candidate.username,
          headline: candidate.headline,
          skills: candidate.skills || [],
          timezone: candidate.availabilityProfile?.timezone || "UTC",
        },
        triageMeta: {
          profileStrengthScore: calculateProfileStrength(candidate),
        },
        scoreBreakdown: {
          overall: overallScore,
          skillsCoverage: skillsCoverageScore,
          availabilityOverlap: availabilityFitScore,
          timezoneFit: timezoneFitScore,
          teamMomentum: momentumContributionScore,
        },
        explainability: {
          matchedSkills,
          missingSkills,
          targetSkills: desiredSkills,
          reasons: [
            `Skills coverage ${skillsCoverageScore}% (${matchedSkills.length}/${Math.max(desiredSkills.length, 1)} matched)`,
            `Availability fit ${availabilityFitScore}% (candidate free ${candidateAvailability.freeHours.toFixed(1)}h vs team avg ${averageTeamFreeHours.toFixed(1)}h)`,
            `Timezone fit ${timezoneFitScore}% (candidate ${candidate.availabilityProfile?.timezone || "UTC"}, team ${majorityTimezone})`,
          ],
        },
      };
    })
    .sort((first, second) => second.scoreBreakdown.overall - first.scoreBreakdown.overall)
    .slice(0, limit);

  return res.json({
    generatedAt: new Date(),
    totalCandidates: requests.length,
    weighting: {
      skillsCoverage: 45,
      availabilityOverlap: 30,
      timezoneFit: 15,
      teamMomentum: 10,
    },
    teamSignals: {
      targetSkills,
      majorityTimezone,
      averageTeamFreeHours: Number(averageTeamFreeHours.toFixed(1)),
      activeTaskCount: activeTasks.length,
      overdueTasks,
      blockedTasks,
      teamMomentumBaseScore,
    },
    rankedRequests,
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

    publishTeamWorkspaceEvent({
      teamId: team._id,
      type: "join_request_triaged",
      actorId: req.user.id,
      payload: {
        joinRequestId: joinRequest._id,
        decision,
        triageStage: joinRequest.triageStage,
      },
    });

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

  publishTeamWorkspaceEvent({
    teamId: team._id,
    type: "join_request_reviewed",
    actorId: req.user.id,
    payload: {
      joinRequestId: joinRequest._id,
      decision,
      status: joinRequest.status,
      triageStage: joinRequest.triageStage,
      userId: joinRequest.user?._id || joinRequest.user,
    },
  });

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

  publishTeamWorkspaceEvent({
    teamId: joinRequest.team._id,
    type: "join_request_cancelled",
    actorId: req.user.id,
    payload: {
      joinRequestId: joinRequest._id,
    },
  });

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
  listRankedJoinRequestsForTeam,
  reviewJoinRequest,
  listMyJoinRequests,
  cancelMyJoinRequest,
};
