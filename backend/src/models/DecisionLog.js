const mongoose = require("mongoose");

const decisionLogSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["proposed", "approved", "superseded", "rejected"],
      default: "proposed",
      index: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    impact: {
      type: String,
      trim: true,
      maxlength: 260,
      default: "",
    },
    decidedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

decisionLogSchema.index({ team: 1, decidedAt: -1 });

module.exports = mongoose.model("DecisionLog", decisionLogSchema);
