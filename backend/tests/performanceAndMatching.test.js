const request = require("supertest");
const User = require("../src/models/User");
const { app, signupUser, loginUser, approveUser, createTeam } = require("./helpers");

describe("Performance intelligence and smart matching", () => {
  test("returns performance intelligence metrics and trend data", async () => {
    await signupUser({ name: "Admin Metrics", email: "admin.metrics@college.edu" });
    const leaderSignup = await signupUser({ name: "Leader Metrics", email: "leader.metrics@college.edu" });
    const memberSignup = await signupUser({ name: "Member Metrics", email: "member.metrics@college.edu" });

    const adminLogin = await loginUser({ email: "admin.metrics@college.edu" });

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

    const leaderLogin = await loginUser({ email: "leader.metrics@college.edu" });
    const memberLogin = await loginUser({ email: "member.metrics@college.edu" });

    const createdTeam = await createTeam({
      token: leaderLogin.body.token,
      payload: {
        name: "Perf Team",
        hackathonLink: "https://hackathon.example.com/perf",
        projectName: "Performance Build",
        githubLink: "https://github.com/demo/perf",
        excalidrawLink: "https://excalidraw.com/#json,perf",
        whatsappLink: "https://chat.whatsapp.com/perf",
        maxSize: 4,
      },
    });

    expect(createdTeam.statusCode).toBe(201);
    const teamId = createdTeam.body.team._id;
    const joinCode = createdTeam.body.team.joinCode;

    const joinRequest = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({ code: joinCode });

    expect(joinRequest.statusCode).toBe(201);

    const shortlist = await request(app)
      .patch(`/api/join-requests/${joinRequest.body.joinRequest._id}/review`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`)
      .send({ decision: "shortlist", note: "Strong profile" });

    expect(shortlist.statusCode).toBe(200);

    const doneTask = await request(app)
      .post(`/api/teams/${teamId}/tasks`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`)
      .send({
        title: "Ship API",
        status: "done",
        priority: "high",
        estimateHours: 6,
        tags: ["node", "api"],
      });

    expect(doneTask.statusCode).toBe(201);

    const overdueTask = await request(app)
      .post(`/api/teams/${teamId}/tasks`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`)
      .send({
        title: "Finalize UI",
        status: "in_progress",
        priority: "critical",
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        blockedReason: "Awaiting design handoff",
        estimateHours: 8,
        tags: ["react", "ui"],
      });

    expect(overdueTask.statusCode).toBe(201);

    const metrics = await request(app)
      .get(`/api/teams/${teamId}/performance-intelligence?days=14`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`);

    expect(metrics.statusCode).toBe(200);
    expect(metrics.body.windowDays).toBe(14);
    expect(metrics.body.metrics).toMatchObject({
      velocityTasksPerWeek: expect.any(Number),
      cycleTimeHours: expect.any(Number),
      wipCount: expect.any(Number),
      blockerAgingDays: expect.any(Number),
      joinRequestConversionRate: expect.any(Number),
      currentDeliveryRiskScore: expect.any(Number),
      currentDeliveryRiskLevel: expect.any(String),
    });
    expect(Array.isArray(metrics.body.trend)).toBe(true);
    expect(metrics.body.trend.length).toBeGreaterThan(0);
  });

  test("ranks pending candidates with explainable smart matching signals", async () => {
    await signupUser({ name: "Admin Match", email: "admin.match@college.edu" });
    const leaderSignup = await signupUser({ name: "Leader Match", email: "leader.match@college.edu" });
    const strongSignup = await signupUser({ name: "Strong Candidate", email: "strong@college.edu" });
    const weakSignup = await signupUser({ name: "Weak Candidate", email: "weak@college.edu" });

    const adminLogin = await loginUser({ email: "admin.match@college.edu" });

    await approveUser({
      adminToken: adminLogin.body.token,
      userId: leaderSignup.body.user.id,
      status: "approved",
    });
    await approveUser({
      adminToken: adminLogin.body.token,
      userId: strongSignup.body.user.id,
      status: "approved",
    });
    await approveUser({
      adminToken: adminLogin.body.token,
      userId: weakSignup.body.user.id,
      status: "approved",
    });

    await User.findByIdAndUpdate(leaderSignup.body.user.id, {
      $set: {
        skills: ["node", "react", "testing"],
        "availabilityProfile.timezone": "Asia/Kolkata",
        "availabilityProfile.weeklyCapacityHours": 16,
        "availabilityProfile.currentLoadHours": 8,
      },
    });

    await User.findByIdAndUpdate(strongSignup.body.user.id, {
      $set: {
        skills: ["react", "node", "design"],
        "availabilityProfile.timezone": "Asia/Kolkata",
        "availabilityProfile.weeklyCapacityHours": 20,
        "availabilityProfile.currentLoadHours": 3,
      },
    });

    await User.findByIdAndUpdate(weakSignup.body.user.id, {
      $set: {
        skills: ["excel", "documentation"],
        "availabilityProfile.timezone": "America/Los_Angeles",
        "availabilityProfile.weeklyCapacityHours": 12,
        "availabilityProfile.currentLoadHours": 11,
      },
    });

    const leaderLogin = await loginUser({ email: "leader.match@college.edu" });
    const strongLogin = await loginUser({ email: "strong@college.edu" });
    const weakLogin = await loginUser({ email: "weak@college.edu" });

    const createdTeam = await createTeam({
      token: leaderLogin.body.token,
      payload: {
        name: "Matching Team",
        hackathonLink: "https://hackathon.example.com/match",
        projectName: "Matching Engine",
        githubLink: "https://github.com/demo/match",
        excalidrawLink: "https://excalidraw.com/#json,match",
        whatsappLink: "https://chat.whatsapp.com/match",
        maxSize: 5,
      },
    });

    expect(createdTeam.statusCode).toBe(201);
    const teamId = createdTeam.body.team._id;
    const joinCode = createdTeam.body.team.joinCode;

    await request(app)
      .post(`/api/teams/${teamId}/tasks`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`)
      .send({
        title: "Build UI",
        status: "in_progress",
        priority: "high",
        tags: ["react", "ui"],
      });

    await request(app)
      .post(`/api/teams/${teamId}/tasks`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`)
      .send({
        title: "Ship backend",
        status: "backlog",
        priority: "high",
        tags: ["node", "api"],
      });

    const strongRequest = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${strongLogin.body.token}`)
      .send({ code: joinCode });

    const weakRequest = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${weakLogin.body.token}`)
      .send({ code: joinCode });

    expect(strongRequest.statusCode).toBe(201);
    expect(weakRequest.statusCode).toBe(201);

    const ranking = await request(app)
      .get(`/api/join-requests/team/${teamId}/ranked`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`);

    expect(ranking.statusCode).toBe(200);
    expect(ranking.body.weighting).toMatchObject({
      skillsCoverage: 45,
      availabilityOverlap: 30,
      timezoneFit: 15,
      teamMomentum: 10,
    });
    expect(Array.isArray(ranking.body.rankedRequests)).toBe(true);
    expect(ranking.body.rankedRequests.length).toBe(2);
    expect(ranking.body.rankedRequests[0].candidate.email).toBe("strong@college.edu");
    expect(ranking.body.rankedRequests[0].scoreBreakdown.overall).toBeGreaterThanOrEqual(
      ranking.body.rankedRequests[1].scoreBreakdown.overall
    );
    expect(ranking.body.rankedRequests[0].explainability.reasons.length).toBeGreaterThan(0);
  });
});
