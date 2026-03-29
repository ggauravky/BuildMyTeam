const { z } = require("zod");

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
});

module.exports = {
  signupSchema,
  loginSchema,
};
