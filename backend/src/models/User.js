const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { GLOBAL_ROLES, USER_STATUSES } = require("../utils/constants");

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_REGEX = /^[a-z0-9_]+$/;
const RESERVED_USERNAMES = new Set(["me"]);

const normalizeUsername = (value) => {
  const normalized = String(value || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9_]/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "");

  if (!normalized) {
    return "";
  }

  if (normalized.length >= USERNAME_MIN_LENGTH) {
    return normalized.slice(0, USERNAME_MAX_LENGTH);
  }

  return `${normalized}${"user".slice(0, USERNAME_MIN_LENGTH - normalized.length)}`.slice(
    0,
    USERNAME_MAX_LENGTH
  );
};

const resolveBaseUsername = (user) => {
  const fromUsername = normalizeUsername(user.username);
  if (fromUsername) {
    return fromUsername;
  }

  const fromName = normalizeUsername(user.name);
  if (fromName) {
    return fromName;
  }

  const emailPrefix = user.email ? user.email.split("@")[0] : "";
  const fromEmail = normalizeUsername(emailPrefix);
  if (fromEmail) {
    return fromEmail;
  }

  return "user";
};

const buildUsernameCandidate = (base, counter) => {
  if (counter === 0) {
    return base;
  }

  const suffix = `_${counter}`;
  return `${base.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
};

const generateUniqueUsername = async (model, base, userId) => {
  for (let counter = 0; counter < 500; counter += 1) {
    const candidate = buildUsernameCandidate(base, counter);

    if (RESERVED_USERNAMES.has(candidate)) {
      continue;
    }

    const existing = await model.exists({ username: candidate, _id: { $ne: userId } });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique username.");
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: USERNAME_MIN_LENGTH,
      maxlength: USERNAME_MAX_LENGTH,
      match: USERNAME_REGEX,
      validate: {
        validator: (value) => !RESERVED_USERNAMES.has(value),
        message: "This username is reserved.",
      },
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(GLOBAL_ROLES),
      default: GLOBAL_ROLES.MEMBER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUSES),
      default: USER_STATUSES.PENDING,
      index: true,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    skills: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 30,
        },
      ],
      default: [],
    },
    socialLinks: {
      github: {
        type: String,
        trim: true,
        default: "",
      },
      linkedin: {
        type: String,
        trim: true,
        default: "",
      },
      website: {
        type: String,
        trim: true,
        default: "",
      },
    },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("validate", async function ensureUsername() {
  if (this.username && !this.isModified("username")) {
    return;
  }

  const baseUsername = resolveBaseUsername(this);
  this.username = await generateUniqueUsername(this.constructor, baseUsername, this._id);
});

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    username: this.username,
    role: this.role,
    status: this.status,
    headline: this.headline,
    bio: this.bio,
    skills: this.skills,
    socialLinks: this.socialLinks,
    teams: this.teams,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("User", userSchema);
