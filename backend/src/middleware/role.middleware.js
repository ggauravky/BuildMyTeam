const mongoose = require("mongoose");
const Team = require("../models/Team");
const { GLOBAL_ROLES, TEAM_MEMBER_ROLES } = require("../utils/constants");

const resolveTeamId = (req, customResolver) => {
  if (typeof customResolver === "function") {
    return customResolver(req);
  }

  return req.params.teamId || req.params.id || req.body.teamId || req.query.teamId;
};

const findTeamMember = (team, userId) =>
  team.members.find((member) => member.user.toString() === userId.toString());

const requireGlobalRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "You are not authorized to access this resource." });
  }

  return next();
};

const createTeamAccessGuard = ({ allowLeaderOnly = false, teamIdResolver = null } = {}) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const teamId = resolveTeamId(req, teamIdResolver);

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "A valid team id is required." });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    if (req.user.role === GLOBAL_ROLES.ADMIN) {
      req.team = team;
      req.teamMember = findTeamMember(team, req.user.id) || null;
      return next();
    }

    const teamMember = findTeamMember(team, req.user.id);

    if (!teamMember) {
      return res.status(403).json({ message: "You are not a member of this team." });
    }

    if (allowLeaderOnly && teamMember.role !== TEAM_MEMBER_ROLES.LEADER) {
      return res.status(403).json({ message: "Only the team leader can perform this action." });
    }

    req.team = team;
    req.teamMember = teamMember;

    return next();
  };
};

const requireTeamMemberOrAdmin = (teamIdResolver) =>
  createTeamAccessGuard({ allowLeaderOnly: false, teamIdResolver });

const requireTeamLeaderOrAdmin = (teamIdResolver) =>
  createTeamAccessGuard({ allowLeaderOnly: true, teamIdResolver });

const requireTeamCreatorOrAdmin = (teamIdResolver = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const teamId = resolveTeamId(req, teamIdResolver);

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "A valid team id is required." });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    if (req.user.role === GLOBAL_ROLES.ADMIN) {
      req.team = team;
      return next();
    }

    const creatorId = team.createdBy ? team.createdBy.toString() : team.leader.toString();

    if (creatorId !== req.user.id.toString()) {
      return res.status(403).json({ message: "Only the team creator or admin can perform this action." });
    }

    req.team = team;
    return next();
  };
};

const requireTeamManagerOrAdmin = (teamIdResolver = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const teamId = resolveTeamId(req, teamIdResolver);

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "A valid team id is required." });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    if (req.user.role === GLOBAL_ROLES.ADMIN) {
      req.team = team;
      req.teamMember = findTeamMember(team, req.user.id) || null;
      return next();
    }

    const creatorId = team.createdBy ? team.createdBy.toString() : team.leader.toString();
    const isCreator = creatorId === req.user.id.toString();
    const isLeader = team.leader?.toString() === req.user.id.toString();

    if (!isCreator && !isLeader) {
      return res.status(403).json({ message: "Only a team manager or admin can perform this action." });
    }

    req.team = team;
    req.teamMember = findTeamMember(team, req.user.id) || null;

    return next();
  };
};

module.exports = {
  requireGlobalRole,
  requireTeamMemberOrAdmin,
  requireTeamLeaderOrAdmin,
  requireTeamCreatorOrAdmin,
  requireTeamManagerOrAdmin,
};
