const User = require("../models/User");
const { GLOBAL_ROLES, USER_STATUSES } = require("../utils/constants");

const syncAdminFromEnv = async ({ name, email, password }) => {
  if (!email || !password) {
    return {
      synced: false,
      reason: "missing_admin_credentials",
    };
  }

  let user = await User.findOne({ email }).select("+password");

  if (user) {
    const passwordChanged = !(await user.comparePassword(password));

    user.name = name || user.name;
    user.role = GLOBAL_ROLES.ADMIN;
    user.status = USER_STATUSES.APPROVED;

    if (passwordChanged) {
      user.password = password;
    }

    await user.save();

    return {
      synced: true,
      action: "updated",
      email: user.email,
      passwordChanged,
    };
  }

  user = await User.create({
    name,
    email,
    password,
    role: GLOBAL_ROLES.ADMIN,
    status: USER_STATUSES.APPROVED,
  });

  return {
    synced: true,
    action: "created",
    email: user.email,
    passwordChanged: true,
  };
};

module.exports = {
  syncAdminFromEnv,
};
