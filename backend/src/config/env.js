const dotenv = require("dotenv");

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";

const requiredVariables = ["MONGODB_URI", "JWT_SECRET"];

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

requiredVariables.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  mongoServerSelectionTimeoutMs: parsePositiveInteger(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    10000
  ),
  dbFallbackToMemory: parseBoolean(process.env.DB_FALLBACK_TO_MEMORY, nodeEnv === "development"),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl:
    process.env.CLIENT_URL ||
    (nodeEnv === "production"
      ? "https://buildmyteam.vercel.app"
      : "http://localhost:5173,http://localhost:5174"),
  adminSyncOnStartup: parseBoolean(process.env.ADMIN_SYNC_ON_STARTUP, process.env.NODE_ENV !== "production"),
  adminName: process.env.ADMIN_NAME || "Platform Admin",
  adminEmail: process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
};