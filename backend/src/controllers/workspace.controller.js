const mongoose = require("mongoose");
const Team = require("../models/Team");
const User = require("../models/User");
const JoinRequest = require("../models/JoinRequest");
const Task = require("../models/Task");
const OnboardingProgress = require("../models/OnboardingProgress");
const DecisionLog = require("../models/DecisionLog");
const OwnershipLedger = require("../models/OwnershipLedger");
const asyncHandler = require("../utils/asyncHandler");
const {
  JOIN_REQUEST_STATUSES,
  JOIN_REQUEST_TRIAGE_STAGES,
  NOTIFICATION_TYPES,
  TASK_STATUSES,
} = require("../utils/constants");
const { createNotification } = require("../services/notification.service");

const ACTIVE_TASK_STATUSES = [TASK_STATUSES.BACKLOG, TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.REVIEW];

const resolveMemberUserId = (member) => {
  if (!member?.user) {
    return "";
  }

  return typeof member.user === "string" ? member.user : member.user.toString();
};

const resolveTeamFromRequest = async (req) => {
  if (req.team) {
    return req.team;
  }

  return Team.findById(req.params.id || req.params.teamId);
};

const touchTeamActivity = async (teamId) => {
  await Team.updateOne({ _id: teamId }, { $set: { "health.lastActivityAt": new Date() } });
};

const assertObjectId = (value, message) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

const assertMemberBelongsToTeam = (team, memberId, message = "Member is not part of this team.") => {
  const isMember = team.members.some((member) => resolveMemberUserId(member) === memberId.toString());

  if (!isMember) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

const handleControllerError = (error, res) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  throw error;
};

const mapTaskPayload = (task) => ({
  _id: task._id,
  team: task.team,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  assignee: task.assignee,
  createdBy: task.createdBy,
  dueDate: task.dueDate,
  estimateHours: task.estimateHours,
  blockedReason: task.blockedReason,
  tags: task.tags,
  completedAt: task.completedAt,
  activity: task.activity,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const listTaskBoard = asyncHandler(async (req, res) => {
  const team = await resolveTeamFromRequest(req);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  const statusFilter = req.query.status;
  const query = { team: team._id };

  if (statusFilter && Object.values(TASK_STATUSES).includes(statusFilter)) {
    query.status = statusFilter;
  }

  const tasks = await Task.find(query)
    .populate("assignee", "name username availabilityProfile")
    .populate("createdBy", "name username")
    .sort({ createdAt: -1 });

  return res.json({ tasks: tasks.map(mapTaskPayload) });
});

const createTask = asyncHandler(async (req, res) => {
  try {
    const team = await resolveTeamFromRequest(req);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      estimateHours,
      blockedReason,
      tags,
    } = req.body;

    let assignee = null;

    if (assigneeId) {
      assertObjectId(assigneeId, "Invalid assignee id.");
      assertMemberBelongsToTeam(team, assigneeId, "Assignee must be a team member.");
      assignee = assigneeId;
    }

    const task = await Task.create({
      team: team._id,
      title,
      description: description || "",
      status,
      priority,
      assignee,
      createdBy: req.user.id,
      dueDate: dueDate || null,
      estimateHours: estimateHours ?? null,
      blockedReason: blockedReason || "",
      tags: tags || [],
      activity: [
        {
          action: "created",
          by: req.user.id,
          note: "Task created",
        },
      ],
    });

    if (status === TASK_STATUSES.DONE) {
      task.completedAt = new Date();
      await task.save();
    }

    if (assignee && assignee.toString() !== req.user.id.toString()) {
      await createNotification({
        user: assignee,
        type: NOTIFICATION_TYPES.TEAM_UPDATE,
        message: `You were assigned a task in ${team.name}: ${title}`,
        data: {
          teamId: team._id,
          taskId: task._id,
        },
      });
    }

    await touchTeamActivity(team._id);

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name username availabilityProfile")
      .populate("createdBy", "name username");

    return res.status(201).json({ message: "Task created successfully.", task: mapTaskPayload(populatedTask) });
  } catch (error) {
    return handleControllerError(error, res);
  }
});

const updateTask = asyncHandler(async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const team = await resolveTeamFromRequest(req);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const task = await Task.findOne({ _id: taskId, team: team._id || id });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      estimateHours,
      blockedReason,
      tags,
    } = req.body;

    const activity = [];

    if (title !== undefined && title !== task.title) {
      task.title = title;
      activity.push("title updated");
    }

    if (description !== undefined && description !== task.description) {
      task.description = description;
      activity.push("description updated");
    }

    if (priority !== undefined && priority !== task.priority) {
      task.priority = priority;
      activity.push("priority changed");
    }

    if (status !== undefined && status !== task.status) {
      task.status = status;
      task.completedAt = status === TASK_STATUSES.DONE ? new Date() : null;
      activity.push(`status moved to ${status}`);
    }

    if (assigneeId !== undefined) {
      if (!assigneeId) {
        task.assignee = null;
        activity.push("assignee cleared");
      } else {
        assertObjectId(assigneeId, "Invalid assignee id.");
        assertMemberBelongsToTeam(team, assigneeId, "Assignee must be a team member.");
        if (!task.assignee || task.assignee.toString() !== assigneeId.toString()) {
          task.assignee = assigneeId;
          activity.push("assignee changed");
        }
      }
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate || null;
      activity.push("due date changed");
    }

    if (estimateHours !== undefined) {
      task.estimateHours = estimateHours;
      activity.push("estimate changed");
    }

    if (blockedReason !== undefined) {
      task.blockedReason = blockedReason;
      activity.push("blocker updated");
    }

    if (tags !== undefined) {
      task.tags = tags;
      activity.push("tags updated");
    }

    if (activity.length) {
      task.activity.push({
        action: "updated",
        by: req.user.id,
        note: activity.join(", "),
      });
    }

    await task.save();
    await touchTeamActivity(team._id);

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name username availabilityProfile")
      .populate("createdBy", "name username");

    return res.json({ message: "Task updated successfully.", task: mapTaskPayload(populatedTask) });
  } catch (error) {
    return handleControllerError(error, res);
  }
});

const computeCapacityRows = async (team) => {
  const memberIds = team.members.map((member) => resolveMemberUserId(member)).filter(Boolean);

  const [members, activeTasks] = await Promise.all([
    User.find({ _id: { $in: memberIds } }).select("name username availabilityProfile"),
    Task.find({ team: team._id, status: { $in: ACTIVE_TASK_STATUSES } }).select(
      "assignee estimateHours"
    ),
  ]);

  const taskLoadByMember = new Map();
  const taskCountByMember = new Map();

  activeTasks.forEach((task) => {
    if (!task.assignee) {
      return;
    }

    const memberId = task.assignee.toString();
    taskLoadByMember.set(memberId, (taskLoadByMember.get(memberId) || 0) + Number(task.estimateHours || 2));
    taskCountByMember.set(memberId, (taskCountByMember.get(memberId) || 0) + 1);
  });

  const rows = members.map((member) => {
    const availabilityProfile = member.availabilityProfile || {};
    const weeklyCapacityHours = Number(availabilityProfile.weeklyCapacityHours || 12);
    const baselineLoad = Number(availabilityProfile.currentLoadHours || 0);
    const assignedLoadHours = Number(taskLoadByMember.get(member._id.toString()) || 0);
    const currentLoadHours = baselineLoad + assignedLoadHours;
    const utilizationPercent = weeklyCapacityHours
      ? Math.round((currentLoadHours / weeklyCapacityHours) * 100)
      : 0;

    let risk = "healthy";

    if (utilizationPercent >= 100) {
      risk = "overloaded";
    } else if (utilizationPercent >= 80) {
      risk = "watch";
    }

    return {
      memberId: member._id,
      name: member.name,
      username: member.username,
      timezone: availabilityProfile.timezone || "UTC",
      preferredRole: availabilityProfile.preferredRole || "",
      weeklyCapacityHours,
      baselineLoadHours: baselineLoad,
      assignedLoadHours,
      currentLoadHours,
      assignedTaskCount: taskCountByMember.get(member._id.toString()) || 0,
      utilizationPercent,
      risk,
    };
  });

  return rows.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
};

const getTeamCapacity = asyncHandler(async (req, res) => {
  const team = await resolveTeamFromRequest(req);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  const members = await computeCapacityRows(team);

  return res.json({
    summary: {
      totalMembers: members.length,
      overloadedCount: members.filter((member) => member.risk === "overloaded").length,
      watchCount: members.filter((member) => member.risk === "watch").length,
    },
    members,
  });
});

const updateMemberCapacity = asyncHandler(async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const team = await resolveTeamFromRequest(req);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    assertObjectId(memberId, "Invalid member id.");
    assertMemberBelongsToTeam(team, memberId, "Only team members can receive capacity updates.");

    const user = await User.findById(memberId);

    if (!user) {
      return res.status(404).json({ message: "Member not found." });
    }

    const { timezone, weeklyCapacityHours, currentLoadHours, preferredRole } = req.body;

    if (!user.availabilityProfile) {
      user.availabilityProfile = {};
    }

    if (timezone !== undefined) {
      user.availabilityProfile.timezone = timezone;
    }

    if (weeklyCapacityHours !== undefined) {
      user.availabilityProfile.weeklyCapacityHours = weeklyCapacityHours;
    }

    if (currentLoadHours !== undefined) {
      user.availabilityProfile.currentLoadHours = currentLoadHours;
    }

    if (preferredRole !== undefined) {
      user.availabilityProfile.preferredRole = preferredRole;
    }

    await user.save();
    await touchTeamActivity(team._id || id);

    return res.json({
      message: "Capacity updated successfully.",
      member: {
        memberId: user._id,
        name: user.name,
        username: user.username,
        availabilityProfile: user.availabilityProfile,
      },
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
});

const getActionCenter = asyncHandler(async (req, res) => {
  const team = await resolveTeamFromRequest(req);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [pendingRequests, activeTasks, onboardingRecords, capacityRows] = await Promise.all([
    JoinRequest.find({ team: team._id, status: JOIN_REQUEST_STATUSES.PENDING }).select("triageStage"),
    Task.find({ team: team._id, status: { $in: ACTIVE_TASK_STATUSES } }).select(
      "status assignee dueDate blockedReason"
    ),
    OnboardingProgress.find({ team: team._id }).select("completedAt"),
    computeCapacityRows(team),
  ]);

  const todayTasks = activeTasks.filter(
    (task) => task.dueDate && new Date(task.dueDate) >= startOfToday && new Date(task.dueDate) < endOfToday
  ).length;
  const overdueTasks = activeTasks.filter(
    (task) => task.dueDate && new Date(task.dueDate) < startOfToday
  ).length;
  const unassignedTasks = activeTasks.filter((task) => !task.assignee).length;
  const blockedTasks = activeTasks.filter((task) => String(task.blockedReason || "").trim()).length;
  const triageShortlisted = pendingRequests.filter(
    (request) => request.triageStage === JOIN_REQUEST_TRIAGE_STAGES.SHORTLISTED
  ).length;
  const triageInterview = pendingRequests.filter(
    (request) => request.triageStage === JOIN_REQUEST_TRIAGE_STAGES.INTERVIEW
  ).length;

  const onboardingPending = onboardingRecords.filter((record) => !record.completedAt).length;
  const overloadedMembers = capacityRows.filter((row) => row.risk === "overloaded").length;

  const cards = [];

  if (overdueTasks > 0) {
    cards.push({
      id: "overdue-tasks",
      severity: "high",
      title: `${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}`,
      description: "Prioritize overdue items in the task board.",
      targetTab: "tasks",
    });
  }

  if (pendingRequests.length > 0) {
    cards.push({
      id: "pending-triage",
      severity: "medium",
      title: `${pendingRequests.length} pending join request${pendingRequests.length > 1 ? "s" : ""}`,
      description: "Use triage actions to shortlist, interview, approve, or reject quickly.",
      targetTab: "requests",
    });
  }

  if (overloadedMembers > 0) {
    cards.push({
      id: "capacity-risk",
      severity: "medium",
      title: `${overloadedMembers} member${overloadedMembers > 1 ? "s" : ""} overloaded`,
      description: "Rebalance ownership or reduce active WIP for overloaded members.",
      targetTab: "capacity",
    });
  }

  if (onboardingPending > 0) {
    cards.push({
      id: "onboarding-pending",
      severity: "low",
      title: `${onboardingPending} onboarding pack${onboardingPending > 1 ? "s" : ""} in progress`,
      description: "Complete onboarding checklists for faster team alignment.",
      targetTab: "onboarding",
    });
  }

  return res.json({
    summary: {
      pendingRequests: pendingRequests.length,
      triageShortlisted,
      triageInterview,
      tasksDueToday: todayTasks,
      overdueTasks,
      unassignedTasks,
      blockedTasks,
      onboardingPending,
      overloadedMembers,
    },
    cards,
  });
});

const listOnboardingPack = asyncHandler(async (req, res) => {
  const team = await resolveTeamFromRequest(req);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  const records = await OnboardingProgress.find({ team: team._id })
    .populate("user", "name username")
    .populate("createdBy", "name username")
    .sort({ createdAt: -1 });

  return res.json({ records });
});

const initOnboardingPackForMember = asyncHandler(async (req, res) => {
  try {
    const team = await resolveTeamFromRequest(req);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const { memberId } = req.params;
    assertObjectId(memberId, "Invalid member id.");
    assertMemberBelongsToTeam(team, memberId, "Only team members can get onboarding packs.");

    const record = await OnboardingProgress.findOneAndUpdate(
      { team: team._id, user: memberId },
      {
        $setOnInsert: {
          team: team._id,
          user: memberId,
          createdBy: req.user.id,
        },
      },
      {
        new: true,
        upsert: true,
      }
    )
      .populate("user", "name username")
      .populate("createdBy", "name username");

    await touchTeamActivity(team._id);

    return res.status(201).json({ message: "Onboarding pack ready.", record });
  } catch (error) {
    return handleControllerError(error, res);
  }
});

const updateOnboardingPack = asyncHandler(async (req, res) => {
  const team = await resolveTeamFromRequest(req);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  const { recordId } = req.params;
  const { checklist, notes } = req.body;

  const record = await OnboardingProgress.findOne({ _id: recordId, team: team._id });

  if (!record) {
    return res.status(404).json({ message: "Onboarding record not found." });
  }

  if (checklist !== undefined) {
    record.checklist = checklist.map((item) => ({
      ...item,
      completedAt: item.completed ? item.completedAt || new Date() : null,
    }));
  }

  if (notes !== undefined) {
    record.notes = notes;
  }

  const allCompleted = record.checklist.length > 0 && record.checklist.every((item) => item.completed);
  record.completedAt = allCompleted ? new Date() : null;

  await record.save();
  await touchTeamActivity(team._id);

  return res.json({ message: "Onboarding pack updated.", record });
});

const listDecisionLog = asyncHandler(async (req, res) => {
  const team = await resolveTeamFromRequest(req);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  const decisions = await DecisionLog.find({ team: team._id })
    .populate("owner", "name username")
    .populate("createdBy", "name username")
    .sort({ decidedAt: -1, createdAt: -1 });

  return res.json({ decisions });
});

const createDecisionLogEntry = asyncHandler(async (req, res) => {
  try {
    const team = await resolveTeamFromRequest(req);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const { title, summary, ownerId, status, category, impact, decidedAt } = req.body;

    assertObjectId(ownerId, "Invalid owner id.");
    assertMemberBelongsToTeam(team, ownerId, "Decision owner must be a team member.");

    const decision = await DecisionLog.create({
      team: team._id,
      title,
      summary,
      owner: ownerId,
      status,
      category: category || "",
      impact: impact || "",
      decidedAt: decidedAt || new Date(),
      createdBy: req.user.id,
    });

    await touchTeamActivity(team._id);

    const populated = await DecisionLog.findById(decision._id)
      .populate("owner", "name username")
      .populate("createdBy", "name username");

    return res.status(201).json({ message: "Decision logged.", decision: populated });
  } catch (error) {
    return handleControllerError(error, res);
  }
});

const updateDecisionLogEntry = asyncHandler(async (req, res) => {
  try {
    const team = await resolveTeamFromRequest(req);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const { decisionId } = req.params;
    const { title, summary, ownerId, status, category, impact, decidedAt } = req.body;

    const decision = await DecisionLog.findOne({ _id: decisionId, team: team._id });

    if (!decision) {
      return res.status(404).json({ message: "Decision entry not found." });
    }

    if (ownerId !== undefined) {
      assertObjectId(ownerId, "Invalid owner id.");
      assertMemberBelongsToTeam(team, ownerId, "Decision owner must be a team member.");
      decision.owner = ownerId;
    }

    if (title !== undefined) decision.title = title;
    if (summary !== undefined) decision.summary = summary;
    if (status !== undefined) decision.status = status;
    if (category !== undefined) decision.category = category;
    if (impact !== undefined) decision.impact = impact;
    if (decidedAt !== undefined) decision.decidedAt = decidedAt;

    await decision.save();
    await touchTeamActivity(team._id);

    const populated = await DecisionLog.findById(decision._id)
      .populate("owner", "name username")
      .populate("createdBy", "name username");

    return res.json({ message: "Decision entry updated.", decision: populated });
  } catch (error) {
    return handleControllerError(error, res);
  }
});

const listOwnershipLedger = asyncHandler(async (req, res) => {
  const team = await resolveTeamFromRequest(req);

  if (!team) {
    return res.status(404).json({ message: "Team not found." });
  }

  const entries = await OwnershipLedger.find({ team: team._id })
    .populate("owner", "name username")
    .populate("backupOwner", "name username")
    .populate("createdBy", "name username")
    .populate("updatedBy", "name username")
    .sort({ active: -1, area: 1 });

  return res.json({ entries });
});

const createOwnershipEntry = asyncHandler(async (req, res) => {
  try {
    const team = await resolveTeamFromRequest(req);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const { area, ownerId, backupOwnerId, responsibilities, active } = req.body;

    assertObjectId(ownerId, "Invalid owner id.");
    assertMemberBelongsToTeam(team, ownerId, "Owner must be a team member.");

    if (backupOwnerId) {
      assertObjectId(backupOwnerId, "Invalid backup owner id.");
      assertMemberBelongsToTeam(team, backupOwnerId, "Backup owner must be a team member.");
    }

    const entry = await OwnershipLedger.create({
      team: team._id,
      area,
      owner: ownerId,
      backupOwner: backupOwnerId || null,
      responsibilities: responsibilities || [],
      active: active !== undefined ? active : true,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await touchTeamActivity(team._id);

    const populated = await OwnershipLedger.findById(entry._id)
      .populate("owner", "name username")
      .populate("backupOwner", "name username")
      .populate("createdBy", "name username")
      .populate("updatedBy", "name username");

    return res.status(201).json({ message: "Ownership entry created.", entry: populated });
  } catch (error) {
    return handleControllerError(error, res);
  }
});

const updateOwnershipEntry = asyncHandler(async (req, res) => {
  try {
    const team = await resolveTeamFromRequest(req);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    const { entryId } = req.params;
    const { area, ownerId, backupOwnerId, responsibilities, active } = req.body;

    const entry = await OwnershipLedger.findOne({ _id: entryId, team: team._id });

    if (!entry) {
      return res.status(404).json({ message: "Ownership entry not found." });
    }

    if (ownerId !== undefined) {
      assertObjectId(ownerId, "Invalid owner id.");
      assertMemberBelongsToTeam(team, ownerId, "Owner must be a team member.");
      entry.owner = ownerId;
    }

    if (backupOwnerId !== undefined) {
      if (!backupOwnerId) {
        entry.backupOwner = null;
      } else {
        assertObjectId(backupOwnerId, "Invalid backup owner id.");
        assertMemberBelongsToTeam(team, backupOwnerId, "Backup owner must be a team member.");
        entry.backupOwner = backupOwnerId;
      }
    }

    if (area !== undefined) entry.area = area;
    if (responsibilities !== undefined) entry.responsibilities = responsibilities;
    if (active !== undefined) entry.active = active;
    entry.updatedBy = req.user.id;

    await entry.save();
    await touchTeamActivity(team._id);

    const populated = await OwnershipLedger.findById(entry._id)
      .populate("owner", "name username")
      .populate("backupOwner", "name username")
      .populate("createdBy", "name username")
      .populate("updatedBy", "name username");

    return res.json({ message: "Ownership entry updated.", entry: populated });
  } catch (error) {
    return handleControllerError(error, res);
  }
});

module.exports = {
  listTaskBoard,
  createTask,
  updateTask,
  getTeamCapacity,
  updateMemberCapacity,
  getActionCenter,
  listOnboardingPack,
  initOnboardingPackForMember,
  updateOnboardingPack,
  listDecisionLog,
  createDecisionLogEntry,
  updateDecisionLogEntry,
  listOwnershipLedger,
  createOwnershipEntry,
  updateOwnershipEntry,
};
