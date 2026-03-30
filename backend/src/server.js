const app = require("./app");
const { connectDatabase } = require("./config/db");
const {
  mongoUri,
  port,
  adminSyncOnStartup,
  adminName,
  adminEmail,
  adminPassword,
} = require("./config/env");
const { syncAdminFromEnv } = require("./services/adminBootstrap.service");

const startServer = async () => {
  try {
    const dbConnection = await connectDatabase(mongoUri);

    if (dbConnection.mode === "memory-fallback") {
      console.warn(
        "Primary MongoDB connection failed. Using temporary in-memory database for local development."
      );
      console.warn("Reason:", dbConnection.reason);
    }

    if (adminSyncOnStartup) {
      const adminSyncResult = await syncAdminFromEnv({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
      });

      if (!adminSyncResult.synced) {
        console.log("Admin sync skipped: set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
      } else {
        const passwordMessage = adminSyncResult.passwordChanged
          ? "password updated"
          : "password unchanged";

        console.log(
          `Admin sync ${adminSyncResult.action} for ${adminSyncResult.email} (${passwordMessage}).`
        );
      }
    }

    app.listen(port, () => {
      console.log(`Backend server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend server:", error);
    process.exit(1);
  }
};

startServer();
