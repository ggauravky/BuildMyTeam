const Team = require("../models/Team");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { GLOBAL_ROLES, TEAM_MEMBER_ROLES } = require("../utils/constants");

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

const toValidDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const dedupeTrimmedList = (list = []) =>
  Array.from(new Set((list || []).map((entry) => String(entry || "").trim()).filter(Boolean)));

const buildPortfolioForResponse = (portfolio) => ({
  highlights: (portfolio?.highlights || []).map((item) => ({
    title: item.title,
    role: item.role || "",
    description: item.description || "",
    link: item.link || "",
    tags: item.tags || [],
    startedAt: item.startedAt || null,
    endedAt: item.endedAt || null,
  })),
  outcomes: (portfolio?.outcomes || []).map((item) => ({
    label: item.label,
    value: item.value,
    context: item.context || "",
  })),
  roleTimeline: (portfolio?.roleTimeline || []).map((item) => ({
    organization: item.organization,
    role: item.role,
    summary: item.summary || "",
    startDate: item.startDate || null,
    endDate: item.endDate || null,
    isCurrent: Boolean(item.isCurrent),
  })),
});

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

const buildHackathonsParticipated = (teams, profileVisibility = {}, { includeHidden = false } = {}) => {
  const hackathonsMap = new Map();
  const hiddenKeys = new Set((profileVisibility.hiddenHackathonKeys || []).map((item) => String(item)));

  teams.forEach((team) => {
    if (!team.hackathon && !team.hackathonLink) {
      return;
    }

    if (team.hackathon) {
      const key = `hackathon:${team.hackathon._id}`;

      hackathonsMap.set(key, {
        key,
        id: team.hackathon._id,
        title: team.hackathon.title,
        description: team.hackathon.description,
        date: team.hackathon.date,
        link: team.hackathon.link,
      });
      return;
    }

    const key = `link:${team.hackathonLink}`;

    hackathonsMap.set(key, {
      key,
      id: null,
      title: team.hackathonLink,
      description: "External hackathon link",
      date: null,
      link: team.hackathonLink,
    });
  });

  const allEntries = Array.from(hackathonsMap.values());

  if (includeHidden) {
    return allEntries;
  }

  if (profileVisibility.showHackathonsParticipated === false) {
    return [];
  }

  return allEntries.filter((entry) => !hiddenKeys.has(entry.key));
};

const buildEventsParticipated = (teams, profileVisibility = {}, { includeHidden = false } = {}) => {
  const eventsMap = new Map();
  const hiddenKeys = new Set((profileVisibility.hiddenEventKeys || []).map((item) => String(item)));

  teams.forEach((team) => {
    if (!team.event && !team.eventLink) {
      return;
    }

    if (team.event) {
      const key = `event:${team.event._id}`;

      eventsMap.set(key, {
        key,
        id: team.event._id,
        title: team.event.title,
        description: team.event.description,
        date: team.event.date,
        link: team.event.link,
      });
      return;
    }

    const key = `link:${team.eventLink}`;

    eventsMap.set(key, {
      key,
      id: null,
      title: team.eventLink,
      description: "External event link",
      date: null,
      link: team.eventLink,
    });
  });

  const allEntries = Array.from(eventsMap.values());

  if (includeHidden) {
    return allEntries;
  }

  if (profileVisibility.showEventsParticipated === false) {
    return [];
  }

  return allEntries.filter((entry) => !hiddenKeys.has(entry.key));
};

const loadTeamsForUser = (userId, includeMemberEmails = true) => {
  const memberSelect = includeMemberEmails ? "name email username" : "name username";

  return Team.find({ "members.user": userId })
    .populate("hackathon", "title description date link")
    .populate("event", "title description date link")
    .populate("members.user", memberSelect)
    .sort({ createdAt: -1 });
};

const buildOwnProfilePayload = (user, teams) => {
  const profileVisibility = user.profileVisibility || {
    showHackathonsParticipated: true,
    hiddenHackathonKeys: [],
    showEventsParticipated: true,
    hiddenEventKeys: [],
  };

  const allHackathons = buildHackathonsParticipated(teams, profileVisibility, { includeHidden: true });
  const allEvents = buildEventsParticipated(teams, profileVisibility, { includeHidden: true });

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
    profileVisibility,
    portfolio: buildPortfolioForResponse(user.portfolio),
    teams,
    hackathonsParticipatedAll: allHackathons,
    hackathonsParticipated: buildHackathonsParticipated(teams, profileVisibility),
    eventsParticipatedAll: allEvents,
    eventsParticipated: buildEventsParticipated(teams, profileVisibility),
    createdAt: user.createdAt,
    moderation: {
      warningCount: user.moderation?.warnings?.length || 0,
      isSuspended: user.isCurrentlySuspended ? user.isCurrentlySuspended() : false,
    },
  };
};

const buildPublicProfilePayload = (user, teams) => {
  const teamsForPublicView = teams.map((team) => ({
    id: team._id,
    name: team.name,
    trackType: team.trackType,
    projectName: team.projectName,
    memberCount: team.members.length,
    maxSize: team.maxSize,
    hackathonLink: team.hackathon?.link || team.hackathonLink,
    hackathonTitle: team.hackathon?.title || team.hackathonLink,
    eventLink: team.event?.link || team.eventLink,
    eventTitle: team.event?.title || team.eventLink,
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
    portfolio: buildPortfolioForResponse(user.portfolio),
    teams: teamsForPublicView,
    hackathonsParticipated: buildHackathonsParticipated(teams, user.profileVisibility),
    eventsParticipated: buildEventsParticipated(teams, user.profileVisibility),
    createdAt: user.createdAt,
  };
};

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "name email username role status headline bio skills socialLinks profileVisibility portfolio moderation createdAt"
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
    "name email username headline bio skills socialLinks profileVisibility portfolio"
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
    profileVisibility,
    portfolio,
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

  if (profileVisibility !== undefined) {
    const currentVisibility = user.profileVisibility?.toObject
      ? user.profileVisibility.toObject()
      : user.profileVisibility || {};

    user.profileVisibility = {
      showHackathonsParticipated:
        profileVisibility.showHackathonsParticipated ??
        currentVisibility.showHackathonsParticipated ??
        true,
      hiddenHackathonKeys: Array.from(
        new Set(
          (profileVisibility.hiddenHackathonKeys ?? currentVisibility.hiddenHackathonKeys ?? [])
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        )
      ),
      showEventsParticipated:
        profileVisibility.showEventsParticipated ??
        currentVisibility.showEventsParticipated ??
        true,
      hiddenEventKeys: Array.from(
        new Set(
          (profileVisibility.hiddenEventKeys ?? currentVisibility.hiddenEventKeys ?? [])
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        )
      ),
    };
  }

  if (portfolio !== undefined) {
    const currentPortfolio = user.portfolio?.toObject ? user.portfolio.toObject() : user.portfolio || {};

    user.portfolio = {
      highlights: (portfolio.highlights ?? currentPortfolio.highlights ?? []).map((item) => ({
        title: String(item.title || "").trim(),
        role: String(item.role || "").trim(),
        description: String(item.description || "").trim(),
        link: String(item.link || "").trim(),
        tags: dedupeTrimmedList(item.tags || []),
        startedAt: toValidDateOrNull(item.startedAt),
        endedAt: toValidDateOrNull(item.endedAt),
      })),
      outcomes: (portfolio.outcomes ?? currentPortfolio.outcomes ?? []).map((item) => ({
        label: String(item.label || "").trim(),
        value: String(item.value || "").trim(),
        context: String(item.context || "").trim(),
      })),
      roleTimeline: (portfolio.roleTimeline ?? currentPortfolio.roleTimeline ?? []).map((item) => ({
        organization: String(item.organization || "").trim(),
        role: String(item.role || "").trim(),
        summary: String(item.summary || "").trim(),
        startDate: toValidDateOrNull(item.startDate),
        endDate: toValidDateOrNull(item.endDate),
        isCurrent: Boolean(item.isCurrent),
      })),
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
    "name username role status headline bio skills socialLinks profileVisibility portfolio createdAt"
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
