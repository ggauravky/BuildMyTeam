const mongoose = require("mongoose");
const { TASK_PRIORITIES, TASK_STATUSES } = require("../utils/constants");

const taskActivitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUSES),
      default: TASK_STATUSES.BACKLOG,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITIES),
      default: TASK_PRIORITIES.MEDIUM,
      index: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    estimateHours: {
      type: Number,
      min: 0,
      max: 200,
      default: null,
    },
    blockedReason: {
      type: String,
      trim: true,
      maxlength: 300,
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
    completedAt: {
      type: Date,
      default: null,
    },
    activity: {
      type: [taskActivitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ team: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Task", taskSchema);
