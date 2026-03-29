const mongoose = require("mongoose");

const connectDatabase = async (mongoUri) => {
  await mongoose.connect(mongoUri);
};

module.exports = {
  connectDatabase,
};