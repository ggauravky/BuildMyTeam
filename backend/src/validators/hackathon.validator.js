const { z } = require("zod");

const createHackathonSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(2000),
  date: z.coerce.date(),
  link: z.url(),
});

const updateHackathonSchema = createHackathonSchema.partial();

module.exports = {
  createHackathonSchema,
  updateHackathonSchema,
};
