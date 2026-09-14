const path = require("path");

const config = {
  port: process.env.PORT || 3000,

  authFolder: process.env.AUTH_FOLDER
    ? path.resolve(process.env.AUTH_FOLDER)
    : path.join(__dirname, "..", "auth"),

  botName: "CLOUDIX BOT"
};

module.exports = config;