const request = require("supertest");
const { app, signupUser, loginUser, approveUser, createTeam } = require("./helpers");

describe("Events and admin member management", () => {
  test("admin manages events and can kick a member from an event team", async () => {
    await signupUser({ name: "Admin Events", email: "admin.events@college.edu" });
    const leaderSignup = await signupUser({
      name: "Event Leader",
      email: "event.leader@college.edu",
    });
    const memberSignup = await signupUser({
      name: "Event Member",
      email: "event.member@college.edu",
    });

    const adminLogin = await loginUser({ email: "admin.events@college.edu" });

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

    const leaderLogin = await loginUser({ email: "event.leader@college.edu" });
    const memberLogin = await loginUser({ email: "event.member@college.edu" });

    const createdEvent = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send({
        title: "Campus AI Summit",
        description: "A major AI innovation event for campus teams.",
        date: "2026-06-20",
        link: "https://events.example.com/campus-ai-summit",
      });

    expect(createdEvent.statusCode).toBe(201);

    const memberCannotCreateEvent = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({
        title: "Member Event",
        description: "This should not be allowed.",
        date: "2026-06-22",
        link: "https://events.example.com/member-event",
      });

    expect(memberCannotCreateEvent.statusCode).toBe(403);

    const createdTeam = await createTeam({
      token: leaderLogin.body.token,
      payload: {
        targetType: "event",
        eventId: createdEvent.body.event._id,
        name: "Event Builders",
        projectName: "Summit Assistant",
        githubLink: "https://github.com/demo/summit-assistant",
        excalidrawLink: "https://excalidraw.com/#json,event-team",
        whatsappLink: "https://chat.whatsapp.com/event-team",
        maxSize: 4,
      },
    });

    expect(createdTeam.statusCode).toBe(201);
    expect(createdTeam.body.team.trackType).toBe("event");

    const requestToJoin = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({ code: createdTeam.body.team.joinCode });

    expect(requestToJoin.statusCode).toBe(201);

    const reviewJoin = await request(app)
      .patch(`/api/join-requests/${requestToJoin.body.joinRequest._id}/review`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`)
      .send({ decision: "approve" });

    expect(reviewJoin.statusCode).toBe(200);

    const kickMember = await request(app)
      .delete(`/api/admin/teams/${createdTeam.body.team._id}/members/${memberSignup.body.user.id}`)
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send();

    expect(kickMember.statusCode).toBe(200);

    const teamAfterKick = await request(app).get(`/api/teams/${createdTeam.body.team._id}`);

    expect(teamAfterKick.statusCode).toBe(200);
    const remainingMemberIds = teamAfterKick.body.team.members.map((entry) =>
      String(entry.user?._id || entry.user)
    );
    expect(remainingMemberIds).not.toContain(memberSignup.body.user.id);
  });
});
