import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api/admin.api";
import { eventApi } from "../api/event.api";
import { hackathonApi } from "../api/hackathon.api";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";

const initialHackathon = {
  title: "",
  description: "",
  date: "",
  link: "",
};

const initialEvent = {
  title: "",
  description: "",
  date: "",
  link: "",
};

const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
};

const toLabel = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .trim();

const getRiskClassName = (riskLevel) => {
  if (riskLevel === "at_risk") {
    return "bg-rose-100 text-rose-700";
  }

  if (riskLevel === "watch") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.issues?.[0]?.message || error.response?.data?.message || fallback;

export function AdminPanelPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [roleFilter, setRoleFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [hackathonForm, setHackathonForm] = useState(initialHackathon);
  const [editingHackathonId, setEditingHackathonId] = useState("");
  const [hackathonEditForm, setHackathonEditForm] = useState(initialHackathon);
  const [eventForm, setEventForm] = useState(initialEvent);
  const [editingEventId, setEditingEventId] = useState("");
  const [eventEditForm, setEventEditForm] = useState(initialEvent);
  const [message, setMessage] = useState("");

  const refreshAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-command-center"] });
    queryClient.invalidateQueries({ queryKey: ["admin-moderation-audits"] });
    queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const askRequiredReason = (title) => {
    const input = globalThis.prompt(title, "");

    if (input === null) {
      return null;
    }

    const trimmed = input.trim();

    if (trimmed.length < 5) {
      setMessage("Please enter at least 5 characters.");
      return null;
    }

    return trimmed;
  };

  const pendingUsersQuery = useQuery({
    queryKey: ["admin-pending-users"],
    queryFn: () => adminApi.listUsers({ status: "pending", limit: 100, page: 1 }),
    refetchInterval: 15000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", statusFilter, roleFilter, userSearch],
    queryFn: () =>
      adminApi.listUsers({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(userSearch.trim() ? { q: userSearch.trim() } : {}),
        limit: 100,
        page: 1,
      }),
  });

  const teamsQuery = useQuery({
    queryKey: ["admin-teams"],
    queryFn: () => adminApi.listTeams(),
  });

  const hackathonsQuery = useQuery({
    queryKey: ["admin-hackathons"],
    queryFn: () => adminApi.listHackathons(),
  });

  const eventsQuery = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => adminApi.listEvents(),
  });

  const commandCenterQuery = useQuery({
    queryKey: ["admin-command-center"],
    queryFn: () => adminApi.getCommandCenter(),
    refetchInterval: 30000,
  });

  const moderationAuditsQuery = useQuery({
    queryKey: ["admin-moderation-audits"],
    queryFn: () => adminApi.listModerationAudits({ page: 1, limit: 20 }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateUserStatus(id, { status }),
    onSuccess: () => {
      setMessage("User status updated.");
      refreshAdminData();
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, "Unable to update user status."));
    },
  });

  const issueWarningMutation = useMutation({
    mutationFn: ({ id, warningMessage }) => adminApi.issueWarning(id, { message: warningMessage }),
    onSuccess: () => {
      setMessage("Warning issued successfully.");
      refreshAdminData();
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, "Unable to issue warning."));
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: ({ id, payload }) => adminApi.suspendUser(id, payload),
    onSuccess: () => {
      setMessage("User suspended.");
      refreshAdminData();
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, "Unable to suspend user."));
    },
  });

  const unsuspendUserMutation = useMutation({
    mutationFn: ({ id, payload }) => adminApi.unsuspendUser(id, payload),
    onSuccess: () => {
      setMessage("User suspension lifted.");
      refreshAdminData();
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, "Unable to lift suspension."));
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.deactivateUser(id, { reason }),
    onSuccess: () => {
      setMessage("User deactivated.");
      refreshAdminData();
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, "Unable to deactivate user."));
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => adminApi.reactivateUser(id, payload),
    onSuccess: () => {
      setMessage("User reactivated.");
      refreshAdminData();
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, "Unable to reactivate user."));
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.removeUser(id, reason),
    onSuccess: () => {
      setMessage("User removed successfully.");
      refreshAdminData();
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, "Unable to remove user."));
    },
  });

  const createHackathonMutation = useMutation({
    mutationFn: (payload) => hackathonApi.create(payload),
    onSuccess: () => {
      setMessage("Hackathon created.");
      setHackathonForm(initialHackathon);
      queryClient.invalidateQueries({ queryKey: ["admin-hackathons"] });
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
      queryClient.invalidateQueries({ queryKey: ["hackathons-home"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to create hackathon.");
    },
  });

  const updateHackathonMutation = useMutation({
    mutationFn: ({ id, payload }) => hackathonApi.update(id, payload),
    onSuccess: () => {
      setMessage("Hackathon updated.");
      setEditingHackathonId("");
      setHackathonEditForm(initialHackathon);
      queryClient.invalidateQueries({ queryKey: ["admin-hackathons"] });
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
      queryClient.invalidateQueries({ queryKey: ["hackathons-home"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to update hackathon.");
    },
  });

  const deleteHackathonMutation = useMutation({
    mutationFn: (id) => hackathonApi.remove(id),
    onSuccess: () => {
      setMessage("Hackathon deleted.");
      if (editingHackathonId) {
        setEditingHackathonId("");
        setHackathonEditForm(initialHackathon);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-hackathons"] });
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
      queryClient.invalidateQueries({ queryKey: ["hackathons-home"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to delete hackathon.");
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (payload) => eventApi.create(payload),
    onSuccess: () => {
      setMessage("Event created.");
      setEventForm(initialEvent);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to create event.");
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, payload }) => eventApi.update(id, payload),
    onSuccess: () => {
      setMessage("Event updated.");
      setEditingEventId("");
      setEventEditForm(initialEvent);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to update event.");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => eventApi.remove(id),
    onSuccess: () => {
      setMessage("Event deleted.");
      if (editingEventId) {
        setEditingEventId("");
        setEventEditForm(initialEvent);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to delete event.");
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }) => adminApi.removeTeamMember(teamId, userId),
    onSuccess: () => {
      setMessage("Member removed from team.");
      refreshAdminData();
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, "Unable to remove member."));
    },
  });

  const onHackathonChange = (event) => {
    const { name, value } = event.target;
    setHackathonForm((prev) => ({ ...prev, [name]: value }));
  };

  const onHackathonSubmit = (event) => {
    event.preventDefault();
    createHackathonMutation.mutate(hackathonForm);
  };

  const onHackathonEditChange = (event) => {
    const { name, value } = event.target;
    setHackathonEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const onStartHackathonEdit = (hackathon) => {
    setEditingHackathonId(hackathon._id);
    setHackathonEditForm({
      title: hackathon.title,
      description: hackathon.description,
      date: toDateInputValue(hackathon.date),
      link: hackathon.link,
    });
  };

  const onCancelHackathonEdit = () => {
    setEditingHackathonId("");
    setHackathonEditForm(initialHackathon);
  };

  const onHackathonEditSubmit = (event) => {
    event.preventDefault();

    if (!editingHackathonId) {
      return;
    }

    updateHackathonMutation.mutate({
      id: editingHackathonId,
      payload: hackathonEditForm,
    });
  };

  const onDeleteHackathon = (hackathon) => {
    const confirmed = globalThis.confirm(
      `Delete hackathon "${hackathon.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    deleteHackathonMutation.mutate(hackathon._id);
  };

  const onEventChange = (event) => {
    const { name, value } = event.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
  };

  const onEventSubmit = (event) => {
    event.preventDefault();
    createEventMutation.mutate(eventForm);
  };

  const onEventEditChange = (event) => {
    const { name, value } = event.target;
    setEventEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const onStartEventEdit = (item) => {
    setEditingEventId(item._id);
    setEventEditForm({
      title: item.title,
      description: item.description,
      date: toDateInputValue(item.date),
      link: item.link,
    });
  };

  const onCancelEventEdit = () => {
    setEditingEventId("");
    setEventEditForm(initialEvent);
  };

  const onEventEditSubmit = (event) => {
    event.preventDefault();

    if (!editingEventId) {
      return;
    }

    updateEventMutation.mutate({
      id: editingEventId,
      payload: eventEditForm,
    });
  };

  const onDeleteEvent = (item) => {
    const confirmed = globalThis.confirm(`Delete event "${item.title}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    deleteEventMutation.mutate(item._id);
  };

  const onIssueWarning = (userItem) => {
    const warningMessage = askRequiredReason(`Issue warning to ${userItem.name}:`);

    if (!warningMessage) {
      return;
    }

    issueWarningMutation.mutate({
      id: userItem._id,
      warningMessage,
    });
  };

  const onSuspendUser = (userItem) => {
    const reason = askRequiredReason(`Suspend ${userItem.name}. Enter reason:`);

    if (!reason) {
      return;
    }

    const untilInput = globalThis.prompt(
      "Optional end date (ISO or YYYY-MM-DD). Leave empty for indefinite suspension:",
      ""
    );

    if (untilInput === null) {
      return;
    }

    const trimmedUntil = untilInput.trim();
    const payload = { reason };

    if (trimmedUntil) {
      const parsed = new Date(trimmedUntil);

      if (Number.isNaN(parsed.getTime())) {
        setMessage("Invalid suspension end date.");
        return;
      }

      payload.until = parsed.toISOString();
    }

    suspendUserMutation.mutate({ id: userItem._id, payload });
  };

  const onUnsuspendUser = (userItem) => {
    const input = globalThis.prompt(
      `Optional reason for lifting suspension for ${userItem.name}:`,
      "Suspension lifted by admin."
    );

    if (input === null) {
      return;
    }

    const reason = input.trim();
    const payload = reason ? { reason } : {};

    unsuspendUserMutation.mutate({ id: userItem._id, payload });
  };

  const onDeactivateUser = (userItem) => {
    const reason = askRequiredReason(`Deactivate ${userItem.name}. Enter reason:`);

    if (!reason) {
      return;
    }

    deactivateUserMutation.mutate({ id: userItem._id, reason });
  };

  const onReactivateUser = (userItem) => {
    const input = globalThis.prompt(
      `Optional reason for reactivating ${userItem.name}:`,
      "User account reactivated by admin."
    );

    if (input === null) {
      return;
    }

    const reason = input.trim();
    const payload = reason ? { reason } : {};

    reactivateUserMutation.mutate({ id: userItem._id, payload });
  };

  const onRemoveUser = (userItem) => {
    const confirmed = globalThis.confirm(
      `Remove user "${userItem.name}" permanently? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    const reasonInput = globalThis.prompt(
      `Provide reason for removing ${userItem.name}:`,
      "Removed by admin"
    );

    if (reasonInput === null) {
      return;
    }

    const reason = reasonInput.trim() || "Removed by admin";

    removeUserMutation.mutate({
      id: userItem._id,
      reason,
    });
  };

  const users = usersQuery.data?.users || [];
  const pendingUsers = pendingUsersQuery.data?.users || [];
  const teams = teamsQuery.data?.teams || [];
  const hackathons = hackathonsQuery.data?.hackathons || [];
  const events = eventsQuery.data?.events || [];
  const commandCenter = commandCenterQuery.data;
  const moderationAuditLogs = moderationAuditsQuery.data?.logs || [];
  const summary = commandCenter?.summary || {
    users: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
      deactivated: 0,
    },
    teams: {
      total: 0,
      onTrack: 0,
      watch: 0,
      atRisk: 0,
    },
    pendingJoinRequests: 0,
  };

  const moderationBusy =
    issueWarningMutation.isPending ||
    suspendUserMutation.isPending ||
    unsuspendUserMutation.isPending ||
    deactivateUserMutation.isPending ||
    reactivateUserMutation.isPending ||
    removeUserMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Admin Panel"
        description="Command center for approvals, moderation, team health, and platform operations."
      />

      {message ? <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p> : null}

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Command Center Overview</h2>
          {commandCenterQuery.isLoading ? (
            <span className="text-xs text-slate-500">Refreshing...</span>
          ) : (
            <span className="text-xs text-slate-500">Live summary</span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Total Users</p>
            <p className="text-lg font-semibold text-slate-900">{summary.users.total}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs text-amber-700">Pending Approvals</p>
            <p className="text-lg font-semibold text-amber-800">{summary.users.pending}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
            <p className="text-xs text-rose-700">Suspended + Deactivated</p>
            <p className="text-lg font-semibold text-rose-800">
              {summary.users.suspended + summary.users.deactivated}
            </p>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5">
            <p className="text-xs text-teal-700">Pending Join Requests</p>
            <p className="text-lg font-semibold text-teal-800">{summary.pendingJoinRequests}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 px-3 py-3">
            <p className="text-sm font-semibold text-slate-800">Team Health Distribution</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-emerald-50 px-2 py-2">
                <p className="font-semibold text-emerald-700">On Track</p>
                <p className="text-sm font-bold text-emerald-800">{summary.teams.onTrack}</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-2">
                <p className="font-semibold text-amber-700">Watch</p>
                <p className="text-sm font-bold text-amber-800">{summary.teams.watch}</p>
              </div>
              <div className="rounded-lg bg-rose-50 px-2 py-2">
                <p className="font-semibold text-rose-700">At Risk</p>
                <p className="text-sm font-bold text-rose-800">{summary.teams.atRisk}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 px-3 py-3 xl:col-span-2">
            <p className="text-sm font-semibold text-slate-800">At-Risk Team Watchlist</p>
            {(commandCenter?.atRiskTeams || []).length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No teams currently flagged as watch/at-risk.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {commandCenter.atRiskTeams.map((teamItem) => (
                  <div
                    key={teamItem.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{teamItem.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {teamItem.projectName || "No project title"} | Members {teamItem.members}/{teamItem.maxSize}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getRiskClassName(
                          teamItem.riskLevel
                        )}`}
                      >
                        {toLabel(teamItem.riskLevel)}
                      </span>
                      <span className="text-[11px] text-slate-600">{teamItem.progressPercent}% progress</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Pending Approval Queue</h2>
          <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            {pendingUsersQuery.isLoading ? "..." : pendingUsers.length} pending
          </span>
        </div>

        {pendingUsersQuery.isLoading ? (
          <p className="text-sm text-slate-600">Loading pending users...</p>
        ) : null}

        {!pendingUsersQuery.isLoading && pendingUsers.length === 0 ? (
          <p className="text-sm text-slate-600">No pending users right now.</p>
        ) : null}

        <div className="space-y-2">
          {pendingUsers.map((item) => (
            <div key={item._id} className="rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.email}</p>
                </div>
                <StatusBadge value={item.status} />
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateUserMutation.mutate({ id: item._id, status: "approved" })}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => updateUserMutation.mutate({ id: item._id, status: "rejected" })}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">User Approvals</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm sm:w-auto"
              >
                <option value="pending">Pending</option>
                <option value="">All statuses</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
                <option value="deactivated">Deactivated</option>
              </select>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm sm:w-auto"
              >
                <option value="">All roles</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <label className="mb-3 block text-sm font-semibold text-slate-700">
            <span>Search users</span>
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name, email, or username"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
          </label>

          {usersQuery.isLoading ? (
            <p className="text-sm text-slate-600">Loading users...</p>
          ) : null}

          {!usersQuery.isLoading && users.length === 0 ? (
            <p className="text-sm text-slate-600">No users found for the selected status.</p>
          ) : null}

          <div className="space-y-2">
            {users.map((item) => (
              <div key={item._id} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs font-semibold text-slate-600">@{item.username || "unknown"}</p>
                    <p className="text-xs text-slate-500">{item.email}</p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold capitalize">
                    {item.role}
                  </span>
                  <span>Teams: {item.teamCount ?? item.teams?.length ?? 0}</span>
                  <span>Warnings: {item.warningCount || 0}</span>
                  {item.moderation?.isSuspended ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                      Suspended
                    </span>
                  ) : null}
                  {item.moderation?.isDeactivated ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                      Deactivated
                    </span>
                  ) : null}
                </div>

                {item.moderation?.suspensionUntil ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Suspension until: {formatDateTime(item.moderation.suspensionUntil)}
                  </p>
                ) : null}

                {item.headline ? <p className="mt-2 text-xs text-slate-700">{item.headline}</p> : null}

                {item.username ? (
                  <p className="mt-2 text-xs">
                    <Link to={`/profile/${item.username}`} className="font-semibold text-teal-700 hover:underline">
                      View public profile
                    </Link>
                  </p>
                ) : null}

                {(item.skills || []).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.skills.slice(0, 5).map((skill) => (
                      <span
                        key={`${item._id}-${skill}`}
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}

                {item.status === "pending" ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateUserMutation.mutate({ id: item._id, status: "approved" })}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateUserMutation.mutate({ id: item._id, status: "rejected" })}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}

                {item.role === "admin" ? null : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onIssueWarning(item)}
                      disabled={moderationBusy}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Warn
                    </button>

                    {item.moderation?.isSuspended ? (
                      <button
                        type="button"
                        onClick={() => onUnsuspendUser(item)}
                        disabled={moderationBusy}
                        className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Lift Suspension
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSuspendUser(item)}
                        disabled={moderationBusy}
                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Suspend
                      </button>
                    )}

                    {item.moderation?.isDeactivated ? (
                      <button
                        type="button"
                        onClick={() => onReactivateUser(item)}
                        disabled={moderationBusy}
                        className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDeactivateUser(item)}
                        disabled={moderationBusy}
                        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Deactivate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveUser(item)}
                      disabled={moderationBusy}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove User
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Manage Hackathons</h2>

          <form className="mt-3 grid gap-3" onSubmit={onHackathonSubmit}>
            <input name="title" value={hackathonForm.title} onChange={onHackathonChange} required placeholder="Title" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <textarea name="description" value={hackathonForm.description} onChange={onHackathonChange} required placeholder="Description" className="min-h-20 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <input type="date" name="date" value={hackathonForm.date} onChange={onHackathonChange} required className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <input type="url" name="link" value={hackathonForm.link} onChange={onHackathonChange} required placeholder="Event Link" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />

            <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
              {createHackathonMutation.isPending ? "Saving..." : "Add Hackathon"}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {hackathons.map((hackathon) => (
              <div key={hackathon._id} className="rounded-xl border border-slate-200 px-3 py-2">
                {editingHackathonId === hackathon._id ? (
                  <form className="grid gap-2" onSubmit={onHackathonEditSubmit}>
                    <input
                      name="title"
                      value={hackathonEditForm.title}
                      onChange={onHackathonEditChange}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      name="description"
                      value={hackathonEditForm.description}
                      onChange={onHackathonEditChange}
                      required
                      className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      name="date"
                      value={hackathonEditForm.date}
                      onChange={onHackathonEditChange}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="url"
                      name="link"
                      value={hackathonEditForm.link}
                      onChange={onHackathonEditChange}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                      >
                        {updateHackathonMutation.isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={onCancelHackathonEdit}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-900">{hackathon.title}</p>
                    <p className="text-xs text-slate-500">{new Date(hackathon.date).toLocaleDateString()}</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onStartHackathonEdit(hackathon)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteHackathon(hackathon)}
                        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        {deleteHackathonMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Manage Events</h2>

          <form className="mt-3 grid gap-3" onSubmit={onEventSubmit}>
            <input name="title" value={eventForm.title} onChange={onEventChange} required placeholder="Title" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <textarea name="description" value={eventForm.description} onChange={onEventChange} required placeholder="Description" className="min-h-20 rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <input type="date" name="date" value={eventForm.date} onChange={onEventChange} required className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <input type="url" name="link" value={eventForm.link} onChange={onEventChange} required placeholder="Event Link" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />

            <button type="submit" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              {createEventMutation.isPending ? "Saving..." : "Add Event"}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {events.map((item) => (
              <div key={item._id} className="rounded-xl border border-slate-200 px-3 py-2">
                {editingEventId === item._id ? (
                  <form className="grid gap-2" onSubmit={onEventEditSubmit}>
                    <input
                      name="title"
                      value={eventEditForm.title}
                      onChange={onEventEditChange}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      name="description"
                      value={eventEditForm.description}
                      onChange={onEventEditChange}
                      required
                      className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      name="date"
                      value={eventEditForm.date}
                      onChange={onEventEditChange}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="url"
                      name="link"
                      value={eventEditForm.link}
                      onChange={onEventEditChange}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        {updateEventMutation.isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={onCancelEventEdit}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString()}</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onStartEventEdit(item)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEvent(item)}
                        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        {deleteEventMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">Team Member Management</h2>
        <p className="mt-1 text-xs text-slate-500">
          View every member email clearly and remove members when needed.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team._id} className="rounded-xl border border-slate-200 px-3 py-3">
              <p className="text-sm font-semibold text-slate-900">{team.name}</p>
              <p className="text-xs text-slate-500">
                Type: {team.trackType === "event" ? "Event" : "Hackathon"}
              </p>
              <p className="text-xs text-slate-500">
                Context: {team.trackType === "event" ? (team.event?.title || "External event") : (team.hackathon?.title || "External hackathon")}
              </p>
              <p className="text-xs text-slate-500">Leader: {team.leader?.name || "Unknown"}</p>
              <p className="text-xs text-slate-500">Members: {team.members.length}/{team.maxSize}</p>

              <div className="mt-2 space-y-2">
                {team.members.map((member) => {
                  const memberId = typeof member.user === "string" ? member.user : member.user?._id;
                  const memberName = typeof member.user === "string" ? "Unknown" : member.user?.name;
                  const memberEmail = typeof member.user === "string" ? "No email" : member.user?.email;
                  const isLeader = member.role === "leader";

                  return (
                    <div key={`${team._id}-${memberId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{memberName || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{memberEmail || "No email"}</p>
                      </div>

                      {isLeader ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Leader
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            removeTeamMemberMutation.mutate({
                              teamId: team._id,
                              userId: memberId,
                            })
                          }
                          className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          {removeTeamMemberMutation.isPending ? "Removing..." : "Kick"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Moderation Audit Log</h2>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-moderation-audits"] })}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        {moderationAuditsQuery.isLoading ? (
          <p className="text-sm text-slate-600">Loading moderation audit logs...</p>
        ) : null}

        {!moderationAuditsQuery.isLoading && moderationAuditLogs.length === 0 ? (
          <p className="text-sm text-slate-600">No moderation actions recorded yet.</p>
        ) : null}

        <div className="space-y-2">
          {moderationAuditLogs.map((log) => (
            <div key={log._id} className="rounded-xl border border-slate-200 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900">{toLabel(log.action)}</p>
                <span className="text-[11px] text-slate-500">{formatDateTime(log.createdAt)}</span>
              </div>

              <p className="mt-1 text-xs text-slate-700">
                Target: {log.targetUser?.name || "Unknown"} ({log.targetUser?.email || "No email"})
              </p>
              <p className="text-xs text-slate-600">
                By: {log.performedBy?.name || "System"} ({log.performedBy?.email || "No email"})
              </p>

              {log.reason ? <p className="mt-1 text-xs text-slate-600">Reason: {log.reason}</p> : null}
            </div>
          ))}
        </div>

        {(commandCenter?.moderation?.last7Days || []).length > 0 ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-700">Last 7 Days Action Counts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {commandCenter.moderation.last7Days.map((entry) => (
                <span
                  key={entry._id}
                  className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                >
                  {toLabel(entry._id)}: {entry.count}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
