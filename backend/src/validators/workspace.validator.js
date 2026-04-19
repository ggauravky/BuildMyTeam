const { z } = require("zod");
const { TASK_PRIORITIES, TASK_STATUSES } = require("../utils/constants");

const isoDateOrNullSchema = z.union([z.string().trim().min(1), z.null()]);
const taskStatusEnum = z.enum(Object.values(TASK_STATUSES));
const taskPriorityEnum = z.enum(Object.values(TASK_PRIORITIES));

const performanceWindowQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).optional(),
});

const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1200).optional(),
  status: taskStatusEnum.default(TASK_STATUSES.BACKLOG),
  priority: taskPriorityEnum.default(TASK_PRIORITIES.MEDIUM),
  assigneeId: z.union([z.string().trim().min(1), z.null()]).optional(),
  dueDate: isoDateOrNullSchema.optional(),
  estimateHours: z.coerce.number().min(0).max(200).nullable().optional(),
  blockedReason: z.string().trim().max(300).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(1200).optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    assigneeId: z.union([z.string().trim().min(1), z.null(), z.literal("")]).optional(),
    dueDate: isoDateOrNullSchema.optional(),
    estimateHours: z.coerce.number().min(0).max(200).nullable().optional(),
    blockedReason: z.string().trim().max(300).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one task field is required.",
  });

const updateCapacitySchema = z
  .object({
    timezone: z.string().trim().min(1).max(80).optional(),
    weeklyCapacityHours: z.coerce.number().min(1).max(100).optional(),
    currentLoadHours: z.coerce.number().min(0).max(100).optional(),
    preferredRole: z.string().trim().max(80).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one capacity field is required.",
  });

const onboardingChecklistItemSchema = z.object({
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(140),
  completed: z.boolean(),
  completedAt: isoDateOrNullSchema.optional(),
});

const updateOnboardingPackSchema = z
  .object({
    checklist: z.array(onboardingChecklistItemSchema).max(20).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one onboarding field is required.",
  });

const decisionStatusEnum = z.enum(["proposed", "approved", "superseded", "rejected"]);

const createDecisionLogSchema = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(3).max(1500),
  ownerId: z.string().trim().min(1),
  status: decisionStatusEnum.optional(),
  category: z.string().trim().max(80).optional(),
  impact: z.string().trim().max(260).optional(),
  decidedAt: isoDateOrNullSchema.optional(),
});

const updateDecisionLogSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    summary: z.string().trim().min(3).max(1500).optional(),
    ownerId: z.string().trim().min(1).optional(),
    status: decisionStatusEnum.optional(),
    category: z.string().trim().max(80).optional(),
    impact: z.string().trim().max(260).optional(),
    decidedAt: isoDateOrNullSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one decision field is required.",
  });

const createOwnershipEntrySchema = z.object({
  area: z.string().trim().min(2).max(120),
  ownerId: z.string().trim().min(1),
  backupOwnerId: z.union([z.string().trim().min(1), z.null()]).optional(),
  responsibilities: z.array(z.string().trim().min(1).max(180)).max(20).optional(),
  active: z.boolean().optional(),
});

const updateOwnershipEntrySchema = z
  .object({
    area: z.string().trim().min(2).max(120).optional(),
    ownerId: z.string().trim().min(1).optional(),
    backupOwnerId: z.union([z.string().trim().min(1), z.null(), z.literal("")]).optional(),
    responsibilities: z.array(z.string().trim().min(1).max(180)).max(20).optional(),
    active: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one ownership field is required.",
  });

module.exports = {
  performanceWindowQuerySchema,
  createTaskSchema,
  updateTaskSchema,
  updateCapacitySchema,
  updateOnboardingPackSchema,
  createDecisionLogSchema,
  updateDecisionLogSchema,
  createOwnershipEntrySchema,
  updateOwnershipEntrySchema,
};
