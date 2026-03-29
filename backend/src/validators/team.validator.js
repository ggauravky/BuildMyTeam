const { z } = require("zod");

const linkField = z.url();

const createTeamSchema = z.object({
  name: z.string().min(3).max(120),
  hackathonId: z.string().optional(),
  hackathonLink: z.url(),
  projectName: z.string().min(3).max(160),
  githubLink: linkField,
  excalidrawLink: linkField,
  whatsappLink: linkField,
  maxSize: z.coerce.number().int().min(2).max(20),
});

const updateTeamSchema = z
  .object({
    name: z.string().min(3).max(120).optional(),
    hackathonId: z.string().nullable().optional(),
    hackathonLink: z.url().optional(),
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
  code: z.string().regex(/^\d{4,5}$/),
});

const transferLeaderSchema = z.object({
  newLeaderId: z.string().min(1),
});

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  joinByCodeSchema,
  transferLeaderSchema,
};
