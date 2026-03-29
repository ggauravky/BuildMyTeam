const request = require("supertest");
const app = require("../src/app");

const defaultPassword = "StrongPass123!";

const signupUser = async ({ name, email, password = defaultPassword }) => {
  return request(app).post("/api/auth/signup").send({ name, email, password });
};

const loginUser = async ({ email, password = defaultPassword }) => {
  return request(app).post("/api/auth/login").send({ email, password });
};

const approveUser = async ({ adminToken, userId, role = "member", status = "approved" }) => {
  return request(app)
    .patch(`/api/admin/users/${userId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status, role });
};

const createTeam = async ({ token, payload }) => {
  return request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
};

module.exports = {
  app,
  defaultPassword,
  signupUser,
  loginUser,
  approveUser,
  createTeam,
};
