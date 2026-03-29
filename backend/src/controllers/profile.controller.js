const Team = require("../models/Team");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { GLOBAL_ROLES, TEAM_MEMBER_ROLES } = require("../utils/constants");

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

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("name email role status");

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const teams = await Team.find({ "members.user": user._id })
    .populate("hackathon", "title description date link")
    .populate("members.user", "name email")
    .sort({ createdAt: -1 });

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

  return res.json({
    profile: {
      id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: getRoleLabel(user, teams),
      teams,
      hackathonsParticipated: Array.from(hackathonsMap.values()),
    },
  });
});

module.exports = {
  getMyProfile,
};
