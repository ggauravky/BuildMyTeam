const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const {
  GLOBAL_ROLES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  USER_STATUSES,
} = require("../utils/constants");

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_REGEX = /^[a-z0-9_]+$/;
const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const RESERVED_USERNAMES = new Set(["me"]);

const warningSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

const moderationSchema = new mongoose.Schema(
  {
    warnings: {
      type: [warningSchema],
      default: [],
    },
    suspension: {
      isSuspended: {
        type: Boolean,
        default: false,
        index: true,
      },
      reason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
      until: {
        type: Date,
        default: null,
      },
      suspendedAt: {
        type: Date,
        default: null,
      },
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      liftedAt: {
        type: Date,
        default: null,
      },
      liftedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    deactivation: {
      isDeactivated: {
        type: Boolean,
        default: false,
        index: true,
      },
      reason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
      deactivatedAt: {
        type: Date,
        default: null,
      },
      deactivatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reactivatedAt: {
        type: Date,
        default: null,
      },
      reactivatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { _id: false }
);

const profileHighlightSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    role: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 30,
        },
      ],
      default: [],
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const profileOutcomeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    context: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
  },
  { _id: false }
);

const profileRoleTimelineItemSchema = new mongoose.Schema(
  {
    organization: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const profilePortfolioSchema = new mongoose.Schema(
  {
    highlights: {
      type: [profileHighlightSchema],
      default: [],
    },
    outcomes: {
      type: [profileOutcomeSchema],
      default: [],
    },
    roleTimeline: {
      type: [profileRoleTimelineItemSchema],
      default: [],
    },
  },
  { _id: false }
);

const notificationQuietHoursSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    start: {
      type: String,
      trim: true,
      default: "22:00",
      match: HH_MM_REGEX,
    },
    end: {
      type: String,
      trim: true,
      default: "08:00",
      match: HH_MM_REGEX,
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "UTC",
    },
  },
  { _id: false }
);

const notificationPreferencesSchema = new mongoose.Schema(
  {
    inAppEnabled: {
      type: Boolean,
      default: true,
    },
    enabledPriorities: {
      type: [
        {
          type: String,
          enum: Object.values(NOTIFICATION_PRIORITIES),
        },
      ],
      default: () => Object.values(NOTIFICATION_PRIORITIES),
    },
    mutedTypes: {
      type: [
        {
          type: String,
          enum: Object.values(NOTIFICATION_TYPES),
        },
      ],
      default: [],
    },
    quietHours: {
      type: notificationQuietHoursSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const availabilityProfileSchema = new mongoose.Schema(
  {
    timezone: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "UTC",
    },
    weeklyCapacityHours: {
      type: Number,
      min: 1,
      max: 100,
      default: 12,
    },
    currentLoadHours: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    preferredRole: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
  },
  { _id: false }
);

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
    profileVisibility: {
      showHackathonsParticipated: {
        type: Boolean,
        default: true,
      },
      hiddenHackathonKeys: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 120,
          },
        ],
        default: [],
      },
      showEventsParticipated: {
        type: Boolean,
        default: true,
      },
      hiddenEventKeys: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 120,
          },
        ],
        default: [],
      },
    },
    portfolio: {
      type: profilePortfolioSchema,
      default: () => ({}),
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    availabilityProfile: {
      type: availabilityProfileSchema,
      default: () => ({}),
    },
    moderation: {
      type: moderationSchema,
      default: () => ({}),
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

userSchema.methods.isCurrentlySuspended = function isCurrentlySuspended() {
  const suspension = this.moderation?.suspension;

  if (!suspension?.isSuspended) {
    return false;
  }

  if (!suspension.until) {
    return true;
  }

  return suspension.until.getTime() > Date.now();
};

userSchema.methods.isDeactivated = function isDeactivated() {
  return Boolean(this.moderation?.deactivation?.isDeactivated);
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
    profileVisibility: this.profileVisibility,
    portfolio: this.portfolio,
    notificationPreferences: this.notificationPreferences,
    availabilityProfile: this.availabilityProfile,
    moderation: {
      warningCount: this.moderation?.warnings?.length || 0,
      suspension: {
        isSuspended: this.isCurrentlySuspended(),
        until: this.moderation?.suspension?.until || null,
        reason: this.moderation?.suspension?.reason || "",
      },
      deactivation: {
        isDeactivated: this.isDeactivated(),
      },
    },
    teams: this.teams,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("User", userSchema);
