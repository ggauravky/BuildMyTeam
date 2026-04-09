const request = require("supertest");
const { app, signupUser, loginUser, approveUser, createTeam } = require("./helpers");

describe("Notification preferences and priority tiers", () => {
  test("exposes preferences, returns notification priorities, and respects enabled priorities", async () => {
    await signupUser({ name: "Admin Notify", email: "admin.notify@college.edu" });
    const leaderSignup = await signupUser({
      name: "Leader Notify",
      email: "leader.notify@college.edu",
    });
    const memberSignup = await signupUser({
      name: "Member Notify",
      email: "member.notify@college.edu",
    });

    const adminLogin = await loginUser({ email: "admin.notify@college.edu" });

    await approveUser({
      adminToken: adminLogin.body.token,
      userId: leaderSignup.body.user.id,
      status: "approved",
    });

    await approveUser({
      adminToken: adminLogin.body.token,
      userId: memberSignup.body.user.id,
      status: "approved",
    });

    const leaderLogin = await loginUser({ email: "leader.notify@college.edu" });
    const memberLogin = await loginUser({ email: "member.notify@college.edu" });

    const defaultPreferences = await request(app)
      .get("/api/notifications/preferences")
      .set("Authorization", `Bearer ${memberLogin.body.token}`);

    expect(defaultPreferences.statusCode).toBe(200);
    expect(defaultPreferences.body.preferences.inAppEnabled).toBe(true);
    expect(defaultPreferences.body.preferences.enabledPriorities).toEqual(
      expect.arrayContaining(["low", "medium", "high", "critical"])
    );

    const createdTeam = await createTeam({
      token: leaderLogin.body.token,
      payload: {
        name: "Notification Priority Team",
        hackathonLink: "https://hackathons.example.com/notification-priority",
        projectName: "Notification Routing",
        githubLink: "https://github.com/demo/notification-routing",
        excalidrawLink: "https://excalidraw.com/#json,notification-routing",
        whatsappLink: "https://chat.whatsapp.com/notification-routing",
        maxSize: 3,
      },
    });

    expect(createdTeam.statusCode).toBe(201);

    const joinRequest = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({ code: createdTeam.body.team.joinCode });

    expect(joinRequest.statusCode).toBe(201);

    const approvedJoin = await request(app)
      .patch(`/api/join-requests/${joinRequest.body.joinRequest._id}/review`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`)
      .send({ decision: "approve" });

    expect(approvedJoin.statusCode).toBe(200);

    const mediumPriorityList = await request(app)
      .get("/api/notifications?priorities=medium")
      .set("Authorization", `Bearer ${memberLogin.body.token}`);

    expect(mediumPriorityList.statusCode).toBe(200);
    expect(mediumPriorityList.body.notifications.length).toBeGreaterThan(0);
    expect(mediumPriorityList.body.notifications.every((item) => item.priority === "medium")).toBe(true);

    const updatePreferences = await request(app)
      .patch("/api/notifications/preferences")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({
        enabledPriorities: ["critical"],
      });

    expect(updatePreferences.statusCode).toBe(200);
    expect(updatePreferences.body.preferences.enabledPriorities).toEqual(["critical"]);

    const beforeRemovalNotifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${memberLogin.body.token}`);

    expect(beforeRemovalNotifications.statusCode).toBe(200);

    const removeMember = await request(app)
      .delete(`/api/teams/${createdTeam.body.team._id}/members/${memberSignup.body.user.id}`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`);

    expect(removeMember.statusCode).toBe(200);

    const afterRemovalNotifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${memberLogin.body.token}`);

    expect(afterRemovalNotifications.statusCode).toBe(200);
    expect(afterRemovalNotifications.body.notifications.length).toBe(
      beforeRemovalNotifications.body.notifications.length
    );
  });
});
