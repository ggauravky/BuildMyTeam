const { z } = require("zod");

const reviewJoinRequestSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

module.exports = {
  reviewJoinRequestSchema,
};
