const mongoose = require("mongoose");
const { TEAM_MEMBER_ROLES, TEAM_TRACK_TYPES } = require("../utils/constants");

const teamMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(TEAM_MEMBER_ROLES),
      default: TEAM_MEMBER_ROLES.MEMBER,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const teamHealthChecklistItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const defaultHealthChecklist = () => [
  { label: "Problem statement defined", completed: false },
  { label: "MVP scope finalized", completed: false },
  { label: "Pitch draft prepared", completed: false },
];

const teamHealthSchema = new mongoose.Schema(
  {
    progressPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    checklist: {
      type: [teamHealthChecklistItemSchema],
      default: defaultHealthChecklist,
    },
    blockers: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    lastCheckInAt: {
      type: Date,
      default: null,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    trackType: {
      type: String,
      enum: Object.values(TEAM_TRACK_TYPES),
      default: TEAM_TRACK_TYPES.HACKATHON,
      index: true,
    },
    hackathon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hackathon",
      default: null,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    hackathonLink: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    eventLink: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    links: {
      github: {
        type: String,
        required: true,
        trim: true,
      },
      excalidraw: {
        type: String,
        required: true,
        trim: true,
      },
      whatsapp: {
        type: String,
        required: true,
        trim: true,
      },
    },
    maxSize: {
      type: Number,
      required: true,
      min: 2,
      max: 20,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 4,
      maxlength: 12,
      match: /^(\d{4,5}|[A-Z0-9]{10})$/,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    members: {
      type: [teamMemberSchema],
      default: [],
    },
    health: {
      type: teamHealthSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

teamSchema.index({ name: "text", projectName: "text" });

module.exports = mongoose.model("Team", teamSchema);
