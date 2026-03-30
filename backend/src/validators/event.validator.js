const { z } = require("zod");

const createEventSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(2000),
  date: z.coerce.date(),
  link: z.url(),
});

const updateEventSchema = createEventSchema.partial();

module.exports = {
  createEventSchema,
  updateEventSchema,
};
