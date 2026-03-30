const { randomBytes } = require("node:crypto");
const Team = require("../models/Team");

const JOIN_CODE_LENGTH = 10;
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const createCandidate = () => {
  const bytes = randomBytes(JOIN_CODE_LENGTH);

  return Array.from(
    bytes,
    (byte) => JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length]
  ).join("");
};

const generateUniqueJoinCode = async () => {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = createCandidate();
    const exists = await Team.exists({ joinCode: candidate });

    if (!exists) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique team join code.");
};

module.exports = {
  generateUniqueJoinCode,
};
