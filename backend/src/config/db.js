const mongoose = require("mongoose");
const { dbFallbackToMemory, mongoServerSelectionTimeoutMs } = require("./env");

let memoryServer = null;

const connectWithUri = async (mongoUri) => {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: mongoServerSelectionTimeoutMs,
  });
};

const connectDatabase = async (mongoUri) => {
  try {
    await connectWithUri(mongoUri);
    return { mode: "primary" };
  } catch (primaryError) {
    const shouldFallbackToMemory = dbFallbackToMemory;

    if (!shouldFallbackToMemory) {
      throw primaryError;
    }

    let MongoMemoryServer;

    try {
      ({ MongoMemoryServer } = require("mongodb-memory-server"));
    } catch (dependencyError) {
      primaryError.message = `${primaryError.message}\nIn-memory fallback unavailable: ${dependencyError.message}`;
      throw primaryError;
    }

    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri("buildmyteam_dev");

    await connectWithUri(memoryUri);

    return {
      mode: "memory-fallback",
      reason: primaryError.message,
    };
  }
};

const disconnectDatabase = async () => {
  await mongoose.connection.close();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
};