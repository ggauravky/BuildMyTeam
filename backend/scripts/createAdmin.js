const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const { GLOBAL_ROLES, USER_STATUSES } = require("../src/utils/constants");

dotenv.config();

const getArg = (name) => {
  const key = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(key));
  return found ? found.slice(key.length).trim() : "";
};

const name = getArg("name") || process.env.ADMIN_NAME || "Platform Admin";
const email = (getArg("email") || process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const password = getArg("password") || process.env.ADMIN_PASSWORD || "";

if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment.");
  process.exit(1);
}

if (!email || !password) {
  console.error("Admin email and password are required.");
  console.error("Usage:");
  console.error('npm run admin:create -- --name="Admin" --email="admin@college.edu" --password="StrongPass123!"');
  console.error("Or set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in backend/.env");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Admin password must be at least 8 characters.");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  let user = await User.findOne({ email }).select("+password");

  if (user) {
    user.name = name;
    user.role = GLOBAL_ROLES.ADMIN;
    user.status = USER_STATUSES.APPROVED;
    user.password = password;
    await user.save();

    console.log("Existing user promoted to admin and password reset.");
  } else {
    user = await User.create({
      name,
      email,
      password,
      role: GLOBAL_ROLES.ADMIN,
      status: USER_STATUSES.APPROVED,
    });

    console.log("New admin user created successfully.");
  }

  console.log(
    JSON.stringify(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    console.error("Failed to create admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
