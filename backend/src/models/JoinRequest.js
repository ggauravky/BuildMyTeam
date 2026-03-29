const mongoose = require("mongoose");
const { JOIN_REQUEST_STATUSES } = require("../utils/constants");

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
