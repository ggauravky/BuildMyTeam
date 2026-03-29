const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { GLOBAL_ROLES, USER_STATUSES } = require("../utils/constants");
const { signAccessToken } = require("../utils/token");

const sanitizeUser = (user) => user.toSafeObject();

const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const totalUsers = await User.countDocuments();
  const bootstrapAdmin = totalUsers === 0;

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: bootstrapAdmin ? GLOBAL_ROLES.ADMIN : GLOBAL_ROLES.MEMBER,
    status: bootstrapAdmin ? USER_STATUSES.APPROVED : USER_STATUSES.PENDING,
  });

  const token = signAccessToken(user);

  res.status(201).json({
    message: bootstrapAdmin
      ? "Bootstrap admin account created successfully."
      : "Signup successful. Your account is pending admin approval.",
    token,
    user: sanitizeUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (user.status === USER_STATUSES.REJECTED) {
    return res.status(403).json({ message: "Your account was rejected by admin." });
  }

  const token = signAccessToken(user);

  return res.json({
    message:
      user.status === USER_STATUSES.PENDING
        ? "Login successful. Account is pending approval."
        : "Login successful.",
    token,
    user: sanitizeUser(user),
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: "teams",
      select: "name projectName hackathonLink joinCode maxSize leader members",
    })
    .lean();

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({ user });
});

module.exports = {
  signup,
  login,
  getCurrentUser,
};
