const Team = require("../models/Team");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { GLOBAL_ROLES, TEAM_MEMBER_ROLES } = require("../utils/constants");

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

const getRoleLabel = (user, teams) => {
  if (user.role === GLOBAL_ROLES.ADMIN) {
    return "Admin";
  }

  const isLeader = teams.some((team) =>
    team.members.some(
      (member) =>
        member.user &&
        member.user._id.toString() === user._id.toString() &&
        member.role === TEAM_MEMBER_ROLES.LEADER
    )
  );

  return isLeader ? "Team Leader" : "Member";
};

const buildHackathonsParticipated = (teams) => {
  const hackathonsMap = new Map();

  teams.forEach((team) => {
    if (team.hackathon) {
      hackathonsMap.set(String(team.hackathon._id), {
        id: team.hackathon._id,
        title: team.hackathon.title,
        description: team.hackathon.description,
        date: team.hackathon.date,
        link: team.hackathon.link,
      });
      return;
    }

    hackathonsMap.set(`link:${team.hackathonLink}`, {
      id: null,
      title: team.hackathonLink,
      description: "External hackathon link",
      date: null,
      link: team.hackathonLink,
    });
  });

  return Array.from(hackathonsMap.values());
};

const loadTeamsForUser = (userId, includeMemberEmails = true) => {
  const memberSelect = includeMemberEmails ? "name email username" : "name username";

  return Team.find({ "members.user": userId })
    .populate("hackathon", "title description date link")
    .populate("members.user", memberSelect)
    .sort({ createdAt: -1 });
};

const buildOwnProfilePayload = (user, teams) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    status: user.status,
    role: getRoleLabel(user, teams),
    headline: user.headline || "",
    bio: user.bio || "",
    skills: user.skills || [],
    socialLinks: user.socialLinks || { github: "", linkedin: "", website: "" },
    teams,
    hackathonsParticipated: buildHackathonsParticipated(teams),
    createdAt: user.createdAt,
  };
};

const buildPublicProfilePayload = (user, teams) => {
  const teamsForPublicView = teams.map((team) => ({
    id: team._id,
    name: team.name,
    projectName: team.projectName,
    memberCount: team.members.length,
    maxSize: team.maxSize,
    hackathonLink: team.hackathon?.link || team.hackathonLink,
    hackathonTitle: team.hackathon?.title || team.hackathonLink,
  }));

  return {
    id: user._id,
    name: user.name,
    username: user.username,
    role: getRoleLabel(user, teams),
    headline: user.headline || "",
    bio: user.bio || "",
    skills: user.skills || [],
    socialLinks: user.socialLinks || { github: "", linkedin: "", website: "" },
    teams: teamsForPublicView,
    hackathonsParticipated: buildHackathonsParticipated(teams),
    createdAt: user.createdAt,
  };
};

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "name email username role status headline bio skills socialLinks createdAt"
  );

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (!user.username) {
    user.username = undefined;
    await user.save();
  }

  const teams = await loadTeamsForUser(user._id);

  return res.json({
    profile: buildOwnProfilePayload(user, teams),
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "name email username headline bio skills socialLinks"
  );

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const {
    name,
    username,
    headline,
    bio,
    skills,
    socialLinks,
  } = req.body;

  if (name !== undefined) {
    user.name = name.trim();
  }

  if (username !== undefined) {
    user.username = username;
  }

  if (headline !== undefined) {
    user.headline = headline.trim();
  }

  if (bio !== undefined) {
    user.bio = bio.trim();
  }

  if (skills !== undefined) {
    user.skills = Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)));
  }

  if (socialLinks !== undefined) {
    const currentLinks = user.socialLinks?.toObject ? user.socialLinks.toObject() : user.socialLinks || {};
    user.socialLinks = {
      github: socialLinks.github ?? currentLinks.github ?? "",
      linkedin: socialLinks.linkedin ?? currentLinks.linkedin ?? "",
      website: socialLinks.website ?? currentLinks.website ?? "",
    };
  }

  await user.save();

  const teams = await loadTeamsForUser(user._id);

  return res.json({
    message: "Profile updated successfully.",
    profile: buildOwnProfilePayload(user, teams),
  });
});

const getPublicProfileByUsername = asyncHandler(async (req, res) => {
  const normalizedUsername = String(req.params.username || "").trim().toLowerCase();

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return res.status(400).json({ message: "Invalid username format." });
  }

  const user = await User.findOne({ username: normalizedUsername }).select(
    "name username role status headline bio skills socialLinks createdAt"
  );

  if (!user) {
    return res.status(404).json({ message: "Profile not found." });
  }

  const teams = await loadTeamsForUser(user._id, false);

  return res.json({
    profile: buildPublicProfilePayload(user, teams),
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  getPublicProfileByUsername,
};
