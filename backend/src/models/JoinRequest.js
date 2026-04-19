const mongoose = require("mongoose");
const { JOIN_REQUEST_STATUSES, JOIN_REQUEST_TRIAGE_STAGES } = require("../utils/constants");

const joinRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(JOIN_REQUEST_STATUSES),
      default: JOIN_REQUEST_STATUSES.PENDING,
      index: true,
    },
    triageStage: {
      type: String,
      enum: Object.values(JOIN_REQUEST_TRIAGE_STAGES),
      default: JOIN_REQUEST_TRIAGE_STAGES.NEW,
      index: true,
    },
    triageNote: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    triageReasonTemplate: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    triagedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    triagedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

joinRequestSchema.index(
  { user: 1, team: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: JOIN_REQUEST_STATUSES.PENDING },
  }
);

module.exports = mongoose.model("JoinRequest", joinRequestSchema);
