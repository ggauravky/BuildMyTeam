const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { URL } = require("node:url");
const routes = require("./routes");
const { clientUrl, nodeEnv } = require("./config/env");
const { generalLimiter } = require("./middleware/rateLimit.middleware");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();

if (nodeEnv === "production") {
  // Render runs behind a proxy and forwards client IP with x-forwarded-for.
  app.set("trust proxy", 1);
}

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "");

const allowedOrigins = clientUrl
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const isAllowedConfiguredOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);

  if (allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  let originUrl;

  try {
    originUrl = new URL(normalizedOrigin);
  } catch {
    return false;
  }

  return allowedOrigins.some((allowedOrigin) => {
    const wildcardMatch = allowedOrigin.match(/^(https?):\/\/\*\.(.+)$/i);

    if (!wildcardMatch) {
      return false;
    }

    const [, protocol, hostname] = wildcardMatch;

    if (originUrl.protocol !== `${protocol.toLowerCase()}:`) {
      return false;
    }

    return originUrl.hostname === hostname || originUrl.hostname.endsWith(`.${hostname}`);
  });
};

const isAllowedBuildMyTeamVercelOrigin = (origin) => {
  let originUrl;

  try {
    originUrl = new URL(normalizeOrigin(origin));
  } catch {
    return false;
  }

  if (originUrl.protocol !== "https:") {
    return false;
  }

  if (originUrl.hostname === "buildmyteam.vercel.app") {
    return true;
  }

  // Allow Vercel preview deployments for this project.
  return /^buildmyteam-[a-z0-9-]+\.vercel\.app$/i.test(originUrl.hostname);
};

const isAllowedDevOrigin = (origin) =>
  nodeEnv !== "production" && /^http:\/\/localhost:\d+$/.test(normalizeOrigin(origin));

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (
      isAllowedConfiguredOrigin(origin) ||
      isAllowedDevOrigin(origin) ||
      isAllowedBuildMyTeamVercelOrigin(origin)
    ) {
      return callback(null, true);
    }

    // Return false instead of an error so blocked origins don't cause noisy 500s.
    return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "buildmyteam-backend" });
});

app.use("/api", generalLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
