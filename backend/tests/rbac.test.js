const request = require("supertest");
const { app, signupUser, loginUser } = require("./helpers");

describe("RBAC behavior", () => {
  test("admin can access admin users endpoint", async () => {
    await signupUser({ name: "Admin Access", email: "admin-access@college.edu" });
    const adminLogin = await loginUser({ email: "admin-access@college.edu" });

    const response = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminLogin.body.token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.users)).toBe(true);
  });
});
