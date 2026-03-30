const User = require("../models/User");
const Team = require("../models/Team");
const Hackathon = require("../models/Hackathon");
const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");
const { NOTIFICATION_TYPES, USER_STATUSES } = require("../utils/constants");

const escapeRegex = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.role) {
    filter.role = req.query.role;
  }

  const query = String(req.query.q || "").trim();
  if (query) {
    const pattern = escapeRegex(query);
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
      { username: { $regex: pattern, $options: "i" } },
    ];
  }

  const statusPriority = {
    $switch: {
      branches: [
        { case: { $eq: ["$status", USER_STATUSES.PENDING] }, then: 0 },
        { case: { $eq: ["$status", USER_STATUSES.APPROVED] }, then: 1 },
        { case: { $eq: ["$status", USER_STATUSES.REJECTED] }, then: 2 },
      ],
      default: 3,
    },
  };

  const [users, total] = await Promise.all([
    User.aggregate([
      { $match: filter },
      { $addFields: { statusPriority } },
      { $sort: { statusPriority: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          name: 1,
          email: 1,
          username: 1,
          role: 1,
          status: 1,
          headline: 1,
          bio: 1,
          skills: 1,
          socialLinks: 1,
          teams: 1,
          teamCount: { $size: { $ifNull: ["$teams", []] } },
          createdAt: 1,
        },
      },
    ]),
    User.countDocuments(filter),
  ]);

  return res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, role } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  user.status = status;
  if (role) {
    user.role = role;
  }

  await user.save();

  const statusMessage =
    status === USER_STATUSES.APPROVED
      ? "Your account has been approved by admin."
      : "Your account has been rejected by admin.";

  await Notification.create({
    user: user._id,
    type: NOTIFICATION_TYPES.SYSTEM,
    message: statusMessage,
    data: { status },
  });

  return res.json({
    message: "User status updated successfully.",
    user: user.toSafeObject(),
  });
});

const listTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find()
    .populate("leader", "name email")
    .populate("hackathon", "title date")
    .sort({ createdAt: -1 });

  return res.json({ teams });
});

const listHackathons = asyncHandler(async (req, res) => {
  const hackathons = await Hackathon.find().sort({ date: 1 });
  return res.json({ hackathons });
});

module.exports = {
  listUsers,
  updateUserStatus,
  listTeams,
  listHackathons,
};
