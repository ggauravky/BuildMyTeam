const { z } = require("zod");

const reviewJoinRequestSchema = z.object({
  decision: z.enum(["approve", "reject", "shortlist", "interview"]),
  note: z.string().trim().max(300).optional(),
  reasonTemplate: z
    .enum(["skills_mismatch", "capacity_full", "availability_conflict", "scope_mismatch", "other"])
    .optional(),
});

module.exports = {
  reviewJoinRequestSchema,
};
