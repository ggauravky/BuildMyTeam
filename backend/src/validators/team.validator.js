const { z } = require("zod");
const { TEAM_TRACK_TYPES } = require("../utils/constants");

const linkField = z.url();
const optionalUrlOrEmpty = z.union([z.literal(""), z.url()]);
const joinCodePattern = /^(\d{4,5}|[A-Z0-9]{10})$/;
const teamTrackTypeSchema = z.enum([TEAM_TRACK_TYPES.HACKATHON, TEAM_TRACK_TYPES.EVENT]);

const createTeamSchema = z
  .object({
    name: z.string().min(3).max(120),
    targetType: teamTrackTypeSchema.default(TEAM_TRACK_TYPES.HACKATHON),
    hackathonId: z.string().optional(),
    eventId: z.string().optional(),
    hackathonLink: z.url().optional(),
    eventLink: z.url().optional(),
    projectName: z.string().min(3).max(160),
    githubLink: linkField,
    excalidrawLink: linkField,
    whatsappLink: linkField,
    maxSize: z.coerce.number().int().min(2).max(20),
  })
  .superRefine((payload, ctx) => {
    if (payload.targetType === TEAM_TRACK_TYPES.HACKATHON) {
      if (!payload.hackathonId && !payload.hackathonLink) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hackathonLink"],
          message: "Provide either hackathon selection or hackathon link.",
        });
      }

      return;
    }

    if (!payload.eventId && !payload.eventLink) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventLink"],
        message: "Provide either event selection or event link.",
      });
    }
  });

const updateTeamSchema = z
  .object({
    name: z.string().min(3).max(120).optional(),
    targetType: teamTrackTypeSchema.optional(),
    hackathonId: z.string().nullable().optional(),
    eventId: z.string().nullable().optional(),
    hackathonLink: optionalUrlOrEmpty.optional(),
    eventLink: optionalUrlOrEmpty.optional(),
    projectName: z.string().min(3).max(160).optional(),
    githubLink: linkField.optional(),
    excalidrawLink: linkField.optional(),
    whatsappLink: linkField.optional(),
    maxSize: z.coerce.number().int().min(2).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update.",
  });

const joinByCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => joinCodePattern.test(value), {
      message: "Join code must be 4-5 digits or 10 alphanumeric characters.",
    }),
});

const transferLeaderSchema = z.object({
  newLeaderId: z.string().min(1),
});

const updateTeamHealthSchema = z
  .object({
    progressPercent: z.coerce.number().min(0).max(100).optional(),
    checklist: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(120),
          completed: z.boolean(),
        })
      )
      .max(20)
      .optional(),
    blockers: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
    checkInNow: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one health field is required.",
  });

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  joinByCodeSchema,
  transferLeaderSchema,
  updateTeamHealthSchema,
};
