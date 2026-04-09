const request = require("supertest");
const { app, signupUser, loginUser, approveUser, createTeam } = require("./helpers");

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

  test("team creator and admin can update team while non-creator member is blocked", async () => {
    await signupUser({ name: "Admin Team Edit", email: "admin.team.edit@college.edu" });
    const creatorSignup = await signupUser({
      name: "Creator Team Edit",
      email: "creator.team.edit@college.edu",
    });
    const memberSignup = await signupUser({
      name: "Member Team Edit",
      email: "member.team.edit@college.edu",
    });

    const adminLogin = await loginUser({ email: "admin.team.edit@college.edu" });

    await approveUser({
      adminToken: adminLogin.body.token,
      userId: creatorSignup.body.user.id,
      status: "approved",
    });

    await approveUser({
      adminToken: adminLogin.body.token,
      userId: memberSignup.body.user.id,
      status: "approved",
    });

    const creatorLogin = await loginUser({ email: "creator.team.edit@college.edu" });
    const memberLogin = await loginUser({ email: "member.team.edit@college.edu" });

    const teamCreation = await createTeam({
      token: creatorLogin.body.token,
      payload: {
        name: "RBAC Team",
        hackathonLink: "https://hackathons.example.com/rbac-team",
        projectName: "RBAC Project",
        githubLink: "https://github.com/demo/rbac-team",
        excalidrawLink: "https://excalidraw.com/#json,rbac-team",
        whatsappLink: "https://chat.whatsapp.com/rbac-team",
        maxSize: 4,
      },
    });

    expect(teamCreation.statusCode).toBe(201);

    const creatorUpdate = await request(app)
      .patch(`/api/teams/${teamCreation.body.team._id}`)
      .set("Authorization", `Bearer ${creatorLogin.body.token}`)
      .send({
        name: "RBAC Team Updated",
        projectName: "RBAC Project Updated",
        hackathonLink: "https://hackathons.example.com/rbac-team-updated",
      });

    expect(creatorUpdate.statusCode).toBe(200);
    expect(creatorUpdate.body.team.name).toBe("RBAC Team Updated");

    const adminUpdate = await request(app)
      .patch(`/api/teams/${teamCreation.body.team._id}`)
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send({
        name: "Admin Updated Team",
        projectName: "Admin Update",
        hackathonLink: "https://hackathons.example.com/admin-updated-team",
      });

    expect(adminUpdate.statusCode).toBe(200);
    expect(adminUpdate.body.team.name).toBe("Admin Updated Team");

    const memberUpdate = await request(app)
      .patch(`/api/teams/${teamCreation.body.team._id}`)
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({
        name: "Blocked Member Update",
      });

    expect(memberUpdate.statusCode).toBe(403);
  });

  test("workspace endpoint hides member email from regular members and shows it for creator", async () => {
    await signupUser({ name: "Admin Workspace", email: "admin.workspace@college.edu" });
    const creatorSignup = await signupUser({
      name: "Creator Workspace",
      email: "creator.workspace@college.edu",
    });
    const memberSignup = await signupUser({
      name: "Member Workspace",
      email: "member.workspace@college.edu",
    });

    const adminLogin = await loginUser({ email: "admin.workspace@college.edu" });

    await approveUser({
      adminToken: adminLogin.body.token,
      userId: creatorSignup.body.user.id,
      status: "approved",
    });

    await approveUser({
      adminToken: adminLogin.body.token,
      userId: memberSignup.body.user.id,
      status: "approved",
    });

    const creatorLogin = await loginUser({ email: "creator.workspace@college.edu" });
    const memberLogin = await loginUser({ email: "member.workspace@college.edu" });

    const teamCreation = await createTeam({
      token: creatorLogin.body.token,
      payload: {
        name: "Workspace Privacy Team",
        hackathonLink: "https://hackathons.example.com/workspace-privacy",
        projectName: "Workspace Privacy",
        githubLink: "https://github.com/demo/workspace-privacy",
        excalidrawLink: "https://excalidraw.com/#json,workspace-privacy",
        whatsappLink: "https://chat.whatsapp.com/workspace-privacy",
        maxSize: 3,
      },
    });

    expect(teamCreation.statusCode).toBe(201);

    const joinRequest = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({ code: teamCreation.body.team.joinCode });

    expect(joinRequest.statusCode).toBe(201);

    const approvedJoin = await request(app)
      .patch(`/api/join-requests/${joinRequest.body.joinRequest._id}/review`)
      .set("Authorization", `Bearer ${creatorLogin.body.token}`)
      .send({ decision: "approve" });

    expect(approvedJoin.statusCode).toBe(200);

    const memberWorkspace = await request(app)
      .get(`/api/teams/${teamCreation.body.team._id}/workspace`)
      .set("Authorization", `Bearer ${memberLogin.body.token}`);

    expect(memberWorkspace.statusCode).toBe(200);
    expect(memberWorkspace.body.permissions.canViewMemberEmail).toBe(false);
    expect(memberWorkspace.body.team.members.some((entry) => entry.user.email)).toBe(false);

    const creatorWorkspace = await request(app)
      .get(`/api/teams/${teamCreation.body.team._id}/workspace`)
      .set("Authorization", `Bearer ${creatorLogin.body.token}`);

    expect(creatorWorkspace.statusCode).toBe(200);
    expect(creatorWorkspace.body.permissions.canViewMemberEmail).toBe(true);
    expect(creatorWorkspace.body.team.members.every((entry) => typeof entry.user.email === "string")).toBe(
      true
    );
  });
});
