const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("../config/env");

const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id,
      role: user.role,
      status: user.status,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
};

module.exports = {
  signAccessToken,
};
