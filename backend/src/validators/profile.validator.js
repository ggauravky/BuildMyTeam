const { z } = require("zod");

const optionalUrlOrEmpty = z.union([z.literal(""), z.url()]);

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_]+$/)
      .refine((value) => value !== "me", "This username is reserved.")
      .transform((value) => value.toLowerCase())
      .optional(),
    headline: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(500).optional(),
    skills: z
      .array(z.string().trim().min(1).max(30))
      .max(20)
      .optional(),
    socialLinks: z
      .object({
        github: optionalUrlOrEmpty.optional(),
        linkedin: optionalUrlOrEmpty.optional(),
        website: optionalUrlOrEmpty.optional(),
      })
      .optional(),
    profileVisibility: z
      .object({
        showHackathonsParticipated: z.boolean().optional(),
        hiddenHackathonKeys: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
        showEventsParticipated: z.boolean().optional(),
        hiddenEventKeys: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
      })
      .optional(),
    portfolio: z
      .object({
        highlights: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(120),
              role: z.string().trim().max(80).optional(),
              description: z.string().trim().max(500).optional(),
              link: optionalUrlOrEmpty.optional(),
              tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
              startedAt: z.union([z.string().datetime(), z.null()]).optional(),
              endedAt: z.union([z.string().datetime(), z.null()]).optional(),
            })
          )
          .max(20)
          .optional(),
        outcomes: z
          .array(
            z.object({
              label: z.string().trim().min(1).max(100),
              value: z.string().trim().min(1).max(120),
              context: z.string().trim().max(200).optional(),
            })
          )
          .max(20)
          .optional(),
        roleTimeline: z
          .array(
            z.object({
              organization: z.string().trim().min(1).max(120),
              role: z.string().trim().min(1).max(100),
              summary: z.string().trim().max(300).optional(),
              startDate: z.union([z.string().datetime(), z.null()]).optional(),
              endDate: z.union([z.string().datetime(), z.null()]).optional(),
              isCurrent: z.boolean().optional(),
            })
          )
          .max(20)
          .optional(),
      })
      .optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one profile field is required.",
  });

module.exports = {
  updateProfileSchema,
};
