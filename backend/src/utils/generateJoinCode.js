const Team = require("../models/Team");

const createCandidate = () => {
  const isFourDigit = Math.random() < 0.5;
  const min = isFourDigit ? 1000 : 10000;
  const max = isFourDigit ? 9999 : 99999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
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
