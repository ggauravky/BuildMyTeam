const request = require("supertest");
const { app, signupUser, loginUser, approveUser, createTeam } = require("./helpers");

describe("Auth and approval workflow", () => {
  test("pending users cannot create teams until approved by admin", async () => {
    const adminSignup = await signupUser({ name: "Admin User", email: "admin@college.edu" });
    expect(adminSignup.statusCode).toBe(201);
    expect(adminSignup.body.user.role).toBe("admin");
    expect(adminSignup.body.user.status).toBe("approved");

    const studentSignup = await signupUser({ name: "Student One", email: "student1@college.edu" });
    expect(studentSignup.statusCode).toBe(201);
    expect(studentSignup.body.user.status).toBe("pending");

    const pendingLogin = await loginUser({ email: "student1@college.edu" });
    expect(pendingLogin.statusCode).toBe(200);
    expect(pendingLogin.body.user.status).toBe("pending");

    const createWhilePending = await createTeam({
      token: pendingLogin.body.token,
      payload: {
        name: "Pending Team",
        hackathonLink: "https://example.com/hackathon",
        projectName: "Nexus Starter",
        githubLink: "https://github.com/demo/pending-team",
        excalidrawLink: "https://excalidraw.com/#json,sample",
        whatsappLink: "https://chat.whatsapp.com/example",
        maxSize: 4,
      },
    });

    expect(createWhilePending.statusCode).toBe(403);

    const adminLogin = await loginUser({ email: "admin@college.edu" });
    const approve = await approveUser({
      adminToken: adminLogin.body.token,
      userId: studentSignup.body.user.id,
      status: "approved",
    });

    expect(approve.statusCode).toBe(200);
    expect(approve.body.user.status).toBe("approved");

    const approvedLogin = await loginUser({ email: "student1@college.edu" });
    const createWhileApproved = await createTeam({
      token: approvedLogin.body.token,
      payload: {
        name: "Approved Team",
        hackathonLink: "https://example.com/hackathon",
        projectName: "Nexus Build",
        githubLink: "https://github.com/demo/approved-team",
        excalidrawLink: "https://excalidraw.com/#json,sample2",
        whatsappLink: "https://chat.whatsapp.com/example2",
        maxSize: 4,
      },
    });

    expect(createWhileApproved.statusCode).toBe(201);
    expect(createWhileApproved.body.team.joinCode).toMatch(/^[A-Z0-9]{10}$/);
  });

  test("non-admin users cannot access admin endpoints", async () => {
    await signupUser({ name: "Admin Two", email: "admin2@college.edu" });
    const memberSignup = await signupUser({ name: "Member Two", email: "member2@college.edu" });

    const adminLogin = await loginUser({ email: "admin2@college.edu" });
    await approveUser({
      adminToken: adminLogin.body.token,
      userId: memberSignup.body.user.id,
      status: "approved",
    });

    const memberLogin = await loginUser({ email: "member2@college.edu" });

    const forbiddenAdminAccess = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${memberLogin.body.token}`);

    expect(forbiddenAdminAccess.statusCode).toBe(403);
  });
});
