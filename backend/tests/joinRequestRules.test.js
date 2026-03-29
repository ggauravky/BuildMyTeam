const request = require("supertest");
const { app, signupUser, loginUser, approveUser, createTeam } = require("./helpers");

describe("Join request workflow", () => {
  test("prevents duplicate pending requests and enforces team size limit", async () => {
    await signupUser({ name: "Admin", email: "admin3@college.edu" });
    const leaderSignup = await signupUser({ name: "Leader", email: "leader@college.edu" });
    const memberSignup = await signupUser({ name: "Member", email: "member@college.edu" });

    const adminLogin = await loginUser({ email: "admin3@college.edu" });

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

    const leaderLogin = await loginUser({ email: "leader@college.edu" });
    const memberLogin = await loginUser({ email: "member@college.edu" });

    const createdTeam = await createTeam({
      token: leaderLogin.body.token,
      payload: {
        name: "Alpha Team",
        hackathonLink: "https://hackathon.example.com/alpha",
        projectName: "Alpha Project",
        githubLink: "https://github.com/demo/alpha",
        excalidrawLink: "https://excalidraw.com/#json,alpha",
        whatsappLink: "https://chat.whatsapp.com/alpha",
        maxSize: 2,
      },
    });

    expect(createdTeam.statusCode).toBe(201);
    const teamId = createdTeam.body.team._id;
    const joinCode = createdTeam.body.team.joinCode;

    const firstJoinRequest = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({ code: joinCode });

    expect(firstJoinRequest.statusCode).toBe(201);

    const duplicateJoinRequest = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({ code: joinCode });

    expect(duplicateJoinRequest.statusCode).toBe(409);

    const pending = await request(app)
      .get(`/api/join-requests/team/${teamId}`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`);

    expect(pending.statusCode).toBe(200);
    expect(pending.body.requests).toHaveLength(1);

    const review = await request(app)
      .patch(`/api/join-requests/${pending.body.requests[0]._id}/review`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`)
      .send({ decision: "approve" });

    expect(review.statusCode).toBe(200);

    const extraSignup = await signupUser({ name: "Extra", email: "extra@college.edu" });
    await approveUser({
      adminToken: adminLogin.body.token,
      userId: extraSignup.body.user.id,
      status: "approved",
    });

    const extraLogin = await loginUser({ email: "extra@college.edu" });

    const joinWhenFull = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${extraLogin.body.token}`)
      .send({ code: joinCode });

    expect(joinWhenFull.statusCode).toBe(400);
    expect(joinWhenFull.body.message).toMatch(/full/i);
  });
});
