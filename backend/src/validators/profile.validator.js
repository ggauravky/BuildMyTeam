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
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one profile field is required.",
  });

module.exports = {
  updateProfileSchema,
};
