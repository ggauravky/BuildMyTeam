const request = require("supertest");
const { app, signupUser, loginUser, approveUser, createTeam } = require("./helpers");

describe("Profile and cancellation workflows", () => {
  test("approved user can update profile and fetch public profile by username", async () => {
    await signupUser({ name: "Admin Profile", email: "admin.profile@college.edu" });
    const memberSignup = await signupUser({
      name: "Public Member",
      email: "public.member@college.edu",
    });

    const adminLogin = await loginUser({ email: "admin.profile@college.edu" });

    await approveUser({
      adminToken: adminLogin.body.token,
      userId: memberSignup.body.user.id,
      status: "approved",
    });

    const memberLogin = await loginUser({ email: "public.member@college.edu" });

    const hackathonCreation = await request(app)
      .post("/api/hackathons")
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send({
        title: "Profile Test Hackathon",
        description: "Hackathon for profile participation assertions",
        date: "2026-06-12T09:00:00.000Z",
        link: "https://hackathons.example.com/profile-test",
      });

    expect(hackathonCreation.statusCode).toBe(201);

    const eventCreation = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send({
        title: "Profile Test Event",
        description: "Event for profile participation assertions",
        date: "2026-07-20T10:00:00.000Z",
        link: "https://events.example.com/profile-test",
      });

    expect(eventCreation.statusCode).toBe(201);

    const hackathonTeam = await createTeam({
      token: memberLogin.body.token,
      payload: {
        targetType: "hackathon",
        name: "Participation Hackathon Team",
        hackathonId: hackathonCreation.body.hackathon._id,
        projectName: "Hackathon Participation Tracker",
        githubLink: "https://github.com/publicbuilder/hackathon-participation",
        excalidrawLink: "https://excalidraw.com/#json,participation-hackathon",
        whatsappLink: "https://chat.whatsapp.com/participation-hackathon",
        maxSize: 4,
      },
    });

    expect(hackathonTeam.statusCode).toBe(201);

    const eventTeam = await createTeam({
      token: memberLogin.body.token,
      payload: {
        targetType: "event",
        name: "Participation Event Team",
        eventId: eventCreation.body.event._id,
        projectName: "Event Participation Tracker",
        githubLink: "https://github.com/publicbuilder/event-participation",
        excalidrawLink: "https://excalidraw.com/#json,participation-event",
        whatsappLink: "https://chat.whatsapp.com/participation-event",
        maxSize: 4,
      },
    });

    expect(eventTeam.statusCode).toBe(201);

    const updateProfile = await request(app)
      .patch("/api/profile/me")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({
        username: "public_builder",
        headline: "Building practical full-stack products",
        bio: "I love hackathons and shipping useful tools.",
        skills: ["React", "Node.js", "Design"],
        socialLinks: {
          github: "https://github.com/publicbuilder",
        },
      });

    expect(updateProfile.statusCode).toBe(200);
    expect(updateProfile.body.profile.username).toBe("public_builder");
    expect(updateProfile.body.profile.headline).toMatch(/full-stack/i);
    expect(updateProfile.body.profile.hackathonsParticipated.length).toBe(1);
    expect(updateProfile.body.profile.eventsParticipated.length).toBe(1);

    const publicProfile = await request(app).get("/api/profile/public_builder");

    expect(publicProfile.statusCode).toBe(200);
    expect(publicProfile.body.profile.username).toBe("public_builder");
    expect(publicProfile.body.profile.email).toBeUndefined();
    expect(publicProfile.body.profile.socialLinks.github).toBe(
      "https://github.com/publicbuilder"
    );
    expect(publicProfile.body.profile.hackathonsParticipated).toHaveLength(1);
    expect(publicProfile.body.profile.eventsParticipated).toHaveLength(1);

    const hideEvents = await request(app)
      .patch("/api/profile/me")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({
        profileVisibility: {
          showEventsParticipated: false,
        },
      });

    expect(hideEvents.statusCode).toBe(200);

    const hiddenEventsPublicProfile = await request(app).get("/api/profile/public_builder");

    expect(hiddenEventsPublicProfile.statusCode).toBe(200);
    expect(hiddenEventsPublicProfile.body.profile.hackathonsParticipated).toHaveLength(1);
    expect(hiddenEventsPublicProfile.body.profile.eventsParticipated).toHaveLength(0);

    const eventVisibilityKey =
      hideEvents.body.profile.eventsParticipatedAll?.[0]?.key ||
      updateProfile.body.profile.eventsParticipatedAll?.[0]?.key;

    const hideSpecificEvent = await request(app)
      .patch("/api/profile/me")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({
        profileVisibility: {
          showEventsParticipated: true,
          hiddenEventKeys: eventVisibilityKey ? [eventVisibilityKey] : [],
        },
      });

    expect(hideSpecificEvent.statusCode).toBe(200);

    const hiddenSpecificEventPublicProfile = await request(app).get("/api/profile/public_builder");

    expect(hiddenSpecificEventPublicProfile.statusCode).toBe(200);
    expect(hiddenSpecificEventPublicProfile.body.profile.eventsParticipated).toHaveLength(0);

    const reservedUsername = await request(app)
      .patch("/api/profile/me")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({ username: "me" });

    expect(reservedUsername.statusCode).toBe(400);
    expect(JSON.stringify(reservedUsername.body)).toMatch(/reserved/i);
  });

  test("member can cancel own pending join request", async () => {
    await signupUser({ name: "Admin Cancel", email: "admin.cancel@college.edu" });
    const leaderSignup = await signupUser({ name: "Leader Cancel", email: "leader.cancel@college.edu" });
    const memberSignup = await signupUser({ name: "Member Cancel", email: "member.cancel@college.edu" });

    const adminLogin = await loginUser({ email: "admin.cancel@college.edu" });

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

    const leaderLogin = await loginUser({ email: "leader.cancel@college.edu" });
    const memberLogin = await loginUser({ email: "member.cancel@college.edu" });

    const createdTeam = await createTeam({
      token: leaderLogin.body.token,
      payload: {
        name: "Cancel Test Team",
        hackathonLink: "https://hackathon.example.com/cancel-test",
        projectName: "Cancel Flow",
        githubLink: "https://github.com/demo/cancel-flow",
        excalidrawLink: "https://excalidraw.com/#json,cancel-flow",
        whatsappLink: "https://chat.whatsapp.com/cancel-flow",
        maxSize: 3,
      },
    });

    expect(createdTeam.statusCode).toBe(201);

    const joinRequest = await request(app)
      .post("/api/join-requests/by-code")
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send({ code: createdTeam.body.team.joinCode });

    expect(joinRequest.statusCode).toBe(201);

    const cancelled = await request(app)
      .patch(`/api/join-requests/${joinRequest.body.joinRequest._id}/cancel`)
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send();

    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.body.joinRequest.status).toBe("cancelled");

    const teamPendingRequests = await request(app)
      .get(`/api/join-requests/team/${createdTeam.body.team._id}`)
      .set("Authorization", `Bearer ${leaderLogin.body.token}`);

    expect(teamPendingRequests.statusCode).toBe(200);
    expect(teamPendingRequests.body.requests).toHaveLength(0);

    const myRequests = await request(app)
      .get("/api/join-requests/my")
      .set("Authorization", `Bearer ${memberLogin.body.token}`);

    expect(myRequests.statusCode).toBe(200);
    expect(myRequests.body.requests[0].status).toBe("cancelled");

    const cancelAgain = await request(app)
      .patch(`/api/join-requests/${joinRequest.body.joinRequest._id}/cancel`)
      .set("Authorization", `Bearer ${memberLogin.body.token}`)
      .send();

    expect(cancelAgain.statusCode).toBe(400);
  });
});
