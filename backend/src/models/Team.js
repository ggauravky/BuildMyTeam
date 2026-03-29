const mongoose = require("mongoose");
const { TEAM_MEMBER_ROLES } = require("../utils/constants");

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

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    hackathon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hackathon",
      default: null,
      index: true,
    },
    hackathonLink: {
      type: String,
      required: true,
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
      maxlength: 5,
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
  },
  {
    timestamps: true,
  }
);

teamSchema.index({ name: "text", projectName: "text" });

module.exports = mongoose.model("Team", teamSchema);
