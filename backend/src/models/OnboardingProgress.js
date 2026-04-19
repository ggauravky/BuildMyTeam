const mongoose = require("mongoose");

const onboardingChecklistItemSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const defaultOnboardingChecklist = () => [
  { key: "intro", label: "Posted intro in team chat", completed: false },
  { key: "links", label: "Joined all team tools and links", completed: false },
  { key: "scope", label: "Reviewed scope and roadmap", completed: false },
  { key: "task", label: "Picked first task", completed: false },
];

const onboardingProgressSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    checklist: {
      type: [onboardingChecklistItemSchema],
      default: defaultOnboardingChecklist,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
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

onboardingProgressSchema.index({ team: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("OnboardingProgress", onboardingProgressSchema);
