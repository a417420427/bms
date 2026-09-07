const mongoose = require("mongoose");
const config = require("./index");
const logger = require("../utils/logger");

async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri);
  logger.info(`[MongoDB] connected: ${config.mongoUri}`);
  return mongoose.connection;
}

module.exports = connectDB;
