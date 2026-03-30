const { z } = require("zod");

const signupPasswordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/\d/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.");

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: signupPasswordSchema,
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
});

module.exports = {
  signupSchema,
  loginSchema,
};
