const { z } = require("zod");

const reviewJoinRequestSchema = z.object({
  decision: z.enum(["approve", "reject", "shortlist", "interview"]),
  note: z.string().trim().max(300).optional(),
  reasonTemplate: z
    .enum(["skills_mismatch", "capacity_full", "availability_conflict", "scope_mismatch", "other"])
    .optional(),
});

const rankedJoinRequestsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

module.exports = {
  reviewJoinRequestSchema,
  rankedJoinRequestsQuerySchema,
};
