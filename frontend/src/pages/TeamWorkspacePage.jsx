import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  QrCode,
  ShieldCheck,
  UserMinus,
  UserPlus2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { eventApi } from "../api/event.api";
import { hackathonApi } from "../api/hackathon.api";
import { joinRequestApi } from "../api/joinRequest.api";
import { teamApi } from "../api/team.api";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAuth } from "../hooks/useAuth";

function getMemberUserId(member) {
  if (!member?.user) {
    return "";
  }

  return typeof member.user === "string" ? member.user : member.user._id;
}

const EMPTY_FORM = {
  targetType: "hackathon",
  name: "",
  projectName: "",
  hackathonLink: "",
  eventLink: "",
  githubLink: "",
  excalidrawLink: "",
  whatsappLink: "",
  maxSize: 4,
  hackathonId: "",
  eventId: "",
};

const DEFAULT_HEALTH_CHECKLIST = [
  { label: "Problem statement defined", completed: false },
  { label: "MVP scope finalized", completed: false },
  { label: "Pitch draft prepared", completed: false },
];

const toRiskLabel = (value) => String(value || "on_track").replaceAll("_", " ");

const getRiskClassName = (riskLevel) => {
  if (riskLevel === "at_risk") {
    return "bg-rose-100 text-rose-700";
  }

  if (riskLevel === "watch") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
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

const renderReadOnlyChecklistStatus = (isCompleted) => {
  if (isCompleted) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  return <AlertTriangle className="h-4 w-4 text-amber-600" />;
};

export function TeamWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newLeaderId, setNewLeaderId] = useState("");
  const [healthDraft, setHealthDraft] = useState(null);

  const teamQuery = useQuery({
    queryKey: ["team", id],
    queryFn: () => teamApi.getWorkspace(id),
  });

  const hackathonsQuery = useQuery({
    queryKey: ["hackathons-team-edit"],
    queryFn: () => hackathonApi.list(),
  });

  const eventsQuery = useQuery({
    queryKey: ["events-team-edit"],
    queryFn: () => eventApi.list(),
  });

  const team = teamQuery.data?.team;
  const workspacePermissions = teamQuery.data?.permissions;

  const myMembership = useMemo(() => {
    if (!team || !user) {
      return null;
    }

    return team.members.find((member) => getMemberUserId(member) === user.id) || null;
  }, [team, user]);

  const creatorId = useMemo(() => {
    if (!team) {
      return "";
    }

    if (typeof team.createdBy === "string") {
      return team.createdBy;
    }

    if (team.createdBy?._id) {
      return team.createdBy._id;
    }

    if (typeof team.leader === "string") {
      return team.leader;
    }

    return team.leader?._id || "";
  }, [team]);

  const canManage = Boolean(
    workspacePermissions?.canManage ?? (isAdmin || (user && creatorId === user.id))
  );
  const canViewQr = Boolean(isAdmin || myMembership);
  const canViewHealth = Boolean(isAdmin || myMembership);
  const canViewMemberEmail = Boolean(workspacePermissions?.canViewMemberEmail ?? canManage);

  const teamDerivedForm = useMemo(() => {
    if (!team) {
      return EMPTY_FORM;
    }

    return {
      targetType: team.trackType || "hackathon",
      name: team.name,
      projectName: team.projectName,
      hackathonLink: team.hackathonLink,
      eventLink: team.eventLink || "",
      githubLink: team.links.github,
      excalidrawLink: team.links.excalidraw,
      whatsappLink: team.links.whatsapp,
      maxSize: team.maxSize,
      hackathonId: team.hackathon?._id || "",
      eventId: team.event?._id || "",
    };
  }, [team]);

  const pendingRequestsQuery = useQuery({
    queryKey: ["team-pending-requests", id],
    queryFn: () => joinRequestApi.listPendingForTeam(id),
    enabled: canManage,
  });

  const qrQuery = useQuery({
    queryKey: ["team-qr", id],
    queryFn: () => teamApi.getQr(id),
    enabled: canViewQr,
  });

  const teamHealthQuery = useQuery({
    queryKey: ["team-health", id],
    queryFn: () => teamApi.getHealth(id),
    enabled: canViewHealth,
  });

  const updateTeamMutation = useMutation({
    mutationFn: (payload) => teamApi.update(id, payload),
    onSuccess: () => {
      setMessage("Team details updated.");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error) => {
      setMessage(
        error.response?.data?.issues?.[0]?.message ||
          error.response?.data?.message ||
          "Unable to update team."
      );
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => teamApi.removeMember(id, userId),
    onSuccess: () => {
      setMessage("Member removed from team.");
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      queryClient.invalidateQueries({ queryKey: ["my-teams"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to remove member.");
    },
  });

  const transferLeaderMutation = useMutation({
    mutationFn: (leaderId) => teamApi.transferLeader(id, leaderId),
    onSuccess: () => {
      setMessage("Team leadership updated.");
      queryClient.invalidateQueries({ queryKey: ["team", id] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to transfer leadership.");
    },
  });

  const reviewRequestMutation = useMutation({
    mutationFn: ({ joinRequestId, decision }) => joinRequestApi.review(joinRequestId, decision),
    onSuccess: () => {
      setMessage("Join request reviewed.");
      queryClient.invalidateQueries({ queryKey: ["team-pending-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to review request.");
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: () => teamApi.removeTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["my-teams"] });
      navigate("/teams", { replace: true });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to delete team.");
    },
  });

  const updateTeamHealthMutation = useMutation({
    mutationFn: (payload) => teamApi.updateHealth(id, payload),
    onSuccess: () => {
      setMessage("Team health updated.");
      setHealthDraft(null);
      queryClient.invalidateQueries({ queryKey: ["team-health", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-command-center"] });
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to update team health.");
    },
  });

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onHealthInputChange = (event) => {
    const { name, value } = event.target;
    setHealthDraft((prev) => ({ ...(prev || healthForm), [name]: value }));
  };

  const onToggleChecklistItem = (index) => {
    setHealthDraft((prev) => {
      const base = prev || healthForm;

      return {
        ...base,
        checklist: base.checklist.map((item, itemIndex) =>
        itemIndex === index ? { ...item, completed: !item.completed } : item
        ),
      };
    });
  };

  const onSaveHealth = () => {
    updateTeamHealthMutation.mutate({
      progressPercent: Number(healthForm.progressPercent),
      blockers: healthForm.blockers,
      notes: healthForm.notes,
      checklist: healthForm.checklist,
      checkInNow: true,
    });
  };

  const onUpdateSubmit = (event) => {
    event.preventDefault();

    const payload = {
      targetType: form.targetType,
      name: form.name.trim(),
      projectName: form.projectName.trim(),
      githubLink: form.githubLink.trim(),
      excalidrawLink: form.excalidrawLink.trim(),
      whatsappLink: form.whatsappLink.trim(),
      maxSize: Number(form.maxSize),
    };

    if (payload.targetType === "hackathon") {
      payload.hackathonId = form.hackathonId || null;
      payload.hackathonLink = form.hackathonLink.trim();
      payload.eventId = null;
    }

    if (payload.targetType === "event") {
      payload.eventId = form.eventId || null;
      payload.eventLink = form.eventLink.trim();
      payload.hackathonId = null;
    }

    updateTeamMutation.mutate(payload);
  };

  const onTransferLeader = () => {
    const leaderId = newLeaderId || team?.leader?._id || "";

    if (!leaderId) {
      setMessage("Select a new leader first.");
      return;
    }

    transferLeaderMutation.mutate(leaderId);
  };

  const onToggleEditMode = () => {
    if (!editMode) {
      setForm(teamDerivedForm);
      setNewLeaderId(team?.leader?._id || "");
    }

    setEditMode((prev) => !prev);
  };

  const copyJoinCode = async () => {
    if (!qrQuery.data?.joinCode) {
      return;
    }

    await navigator.clipboard.writeText(qrQuery.data.joinCode);
    setMessage("Join code copied.");
  };

  const onDeleteTeam = () => {
    const confirmed = globalThis.confirm(
      `Delete team "${team?.name}"? This will remove all members and join requests for this team.`
    );

    if (!confirmed) {
      return;
    }

    deleteTeamMutation.mutate();
  };

  if (teamQuery.isLoading) {
    return <LoadingScreen message="Loading team workspace..." />;
  }

  if (teamQuery.isError) {
    return (
      <EmptyState
        title="Workspace access unavailable"
        subtitle={
          teamQuery.error?.response?.data?.message ||
          "You do not have access to this team workspace yet. Join the team or contact the creator."
        }
      />
    );
  }

  if (!team) {
    return <EmptyState title="Team not found" subtitle="This team does not exist or is no longer available." />;
  }

  const pendingRequests = pendingRequestsQuery.data?.requests || [];
  const hackathons = hackathonsQuery.data?.hackathons || [];
  const events = eventsQuery.data?.events || [];
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "members", label: `Members (${team.members.length})` },
    ...(canManage ? [{ id: "requests", label: `Requests (${pendingRequests.length})` }] : []),
    ...(canManage ? [{ id: "settings", label: "Settings" }] : []),
  ];

  const currentTab =
    !canManage && (activeTab === "requests" || activeTab === "settings")
      ? "overview"
      : activeTab;

  const showOverview = currentTab === "overview";
  const showMembers = currentTab === "members";
  const showRequests = currentTab === "requests";
  const showSettings = currentTab === "settings";

  const isEventTeam = team.trackType === "event";
  const contextLabel = isEventTeam ? "Event" : "Hackathon";
  const contextLink = isEventTeam ? team.eventLink : team.hackathonLink;
  const contextName = isEventTeam
    ? (team.event?.title || "No linked event")
    : (team.hackathon?.title || "No linked hackathon");
  const healthSnapshot = teamHealthQuery.data?.health;
  const baseHealthForm = {
    progressPercent: healthSnapshot?.progressPercent ?? 0,
    blockers: healthSnapshot?.blockers || "",
    notes: healthSnapshot?.notes || "",
    checklist: healthSnapshot?.checklist?.length ? healthSnapshot.checklist : DEFAULT_HEALTH_CHECKLIST,
  };
  const healthForm = healthDraft || baseHealthForm;
  const checklistItems = healthForm.checklist || [];
  const completedChecklistCount = checklistItems.filter((item) => item.completed).length;
  const checklistCompletionPercent = checklistItems.length
    ? Math.round((completedChecklistCount / checklistItems.length) * 100)
    : 0;
  const progressPercent = Number(healthForm.progressPercent || 0);
  const healthRiskLevel = healthSnapshot?.riskLevel || "on_track";

  return (
    <div>
      <PageHeader
        title={team.name}
        description={`${contextLabel}: ${contextName} | Project: ${team.projectName} | Members ${team.members.length}/${team.maxSize}`}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto"
              >
                Review Requests
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
              >
                Team Settings
              </button>
            </div>
          ) : null
        }
      />

      {message ? <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p> : null}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Open Seats</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{Math.max(team.maxSize - team.members.length, 0)}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Health Risk</p>
          <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{toRiskLabel(healthRiskLevel)}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Pending Requests</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{canManage ? pendingRequests.length : 0}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace Mode</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{tabs.find((tab) => tab.id === currentTab)?.label || "Overview"}</p>
        </article>
      </section>

      <section className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              currentTab === tab.id
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {showOverview ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Team Resources</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {contextLink ? (
                  <a href={contextLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 break-all text-teal-700 hover:underline">
                    <Link2 className="h-4 w-4" /> {contextLabel} Link
                  </a>
                ) : null}
                <a href={team.links.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 break-all text-teal-700 hover:underline">
                  <Link2 className="h-4 w-4" /> GitHub Repository
                </a>
                <a href={team.links.excalidraw} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 break-all text-teal-700 hover:underline">
                  <Link2 className="h-4 w-4" /> Excalidraw Board
                </a>
                <a href={team.links.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 break-all text-teal-700 hover:underline">
                  <Link2 className="h-4 w-4" /> WhatsApp Group
                </a>
              </div>
            </article>
          ) : null}

          {showSettings && canManage ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Workspace Controls</h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage project metadata, member capacity, and destructive actions from this tab.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleEditMode}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {editMode ? "Close Edit Form" : "Edit Team Details"}
                </button>
                <button
                  type="button"
                  onClick={onDeleteTeam}
                  className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  {deleteTeamMutation.isPending ? "Deleting..." : "Delete Team"}
                </button>
              </div>
            </article>
          ) : null}

          {showSettings && editMode ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-slate-900">Edit Team Details</h3>
              <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onUpdateSubmit}>
                <select name="targetType" value={form.targetType} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="hackathon">Hackathon Team</option>
                  <option value="event">Event Team</option>
                </select>
                <input name="name" value={form.name} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Team Name" />
                <input name="projectName" value={form.projectName} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Project Name" />
                {form.targetType === "hackathon" ? (
                  <select name="hackathonId" value={form.hackathonId} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">No linked hackathon</option>
                    {hackathons.map((hackathon) => (
                      <option key={hackathon._id} value={hackathon._id}>
                        {hackathon.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select name="eventId" value={form.eventId} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">No linked event</option>
                    {events.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                )}
                <input type="number" min={2} max={20} name="maxSize" value={form.maxSize} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Max team size" />
                {form.targetType === "hackathon" ? (
                  <input type="url" name="hackathonLink" value={form.hackathonLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Hackathon Link" />
                ) : (
                  <input type="url" name="eventLink" value={form.eventLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Event Link" />
                )}
                <input type="url" name="githubLink" value={form.githubLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="GitHub Link" />
                <input type="url" name="excalidrawLink" value={form.excalidrawLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Excalidraw Link" />
                <input type="url" name="whatsappLink" value={form.whatsappLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="WhatsApp Link" />
                <button type="submit" className="md:col-span-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                  {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </article>
          ) : null}

          {showMembers ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                <p className="text-xs font-semibold text-slate-500">
                  {team.members.length} of {team.maxSize} seats occupied
                </p>
              </div>

              <ul className="mt-3 space-y-3">
                {team.members.map((member) => {
                  const memberId = getMemberUserId(member);
                  const isLeader = member.role === "leader";
                  const hasAnyContactLink = Boolean(
                    member.contactLinks?.github ||
                      member.contactLinks?.linkedin ||
                      member.contactLinks?.website
                  );

                  return (
                    <li
                      key={memberId}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {member.user?.name || "Unknown User"}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            @{member.user?.username || "member"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Joined {formatDateTime(member.joinedAt)}
                          </p>

                          {canViewMemberEmail && member.user?.email ? (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600">
                              <Mail className="h-3.5 w-3.5 text-slate-500" />
                              {member.user.email}
                            </p>
                          ) : null}

                          {hasAnyContactLink ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {member.contactLinks?.github ? (
                                <a
                                  href={member.contactLinks.github}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  GitHub <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : null}

                              {member.contactLinks?.linkedin ? (
                                <a
                                  href={member.contactLinks.linkedin}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  LinkedIn <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : null}

                              {member.contactLinks?.website ? (
                                <a
                                  href={member.contactLinks.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Website <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge value={member.role} />
                          {canManage && !isLeader ? (
                            <button
                              type="button"
                              onClick={() => removeMemberMutation.mutate(memberId)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              <UserMinus className="h-3.5 w-3.5" /> Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {!canViewMemberEmail ? (
                <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  Member emails are hidden for privacy. Contact links are available for collaboration.
                </p>
              ) : null}
            </article>
          ) : null}

          {showMembers && canManage ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Transfer Team Leader</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <select
                  value={newLeaderId}
                  onChange={(event) => setNewLeaderId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:min-w-52 sm:w-auto"
                >
                  {team.members.map((member) => (
                    <option key={getMemberUserId(member)} value={getMemberUserId(member)}>
                      {member.user?.name || "Unknown"}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onTransferLeader}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Transfer
                </button>
              </div>
            </article>
          ) : null}
        </div>

        <div className="space-y-4">
          {(showOverview || showSettings) && canViewHealth ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Activity className="h-5 w-5 text-teal-700" /> Team Health Dashboard
                </h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getRiskClassName(
                    healthRiskLevel
                  )}`}
                >
                  {toRiskLabel(healthRiskLevel)}
                </span>
              </div>

              {teamHealthQuery.isLoading ? (
                <p className="mt-2 text-sm text-slate-600">Loading health snapshot...</p>
              ) : null}

              {teamHealthQuery.isLoading ? null : (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <p className="text-slate-500">Progress</p>
                      <p className="text-sm font-semibold text-slate-900">{progressPercent}%</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <p className="text-slate-500">Checklist</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {completedChecklistCount}/{checklistItems.length} ({checklistCompletionPercent}%)
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <p className="text-slate-500">Last Check-in</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDateTime(healthSnapshot?.lastCheckInAt)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <p className="text-slate-500">Last Activity</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDateTime(healthSnapshot?.lastActivityAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span>Progress Meter</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                      />
                    </div>

                    {canManage ? (
                      <input
                        type="range"
                        min={0}
                        max={100}
                        name="progressPercent"
                        value={progressPercent}
                        onChange={onHealthInputChange}
                        className="mt-2 w-full accent-teal-600"
                      />
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-700">Checklist</p>
                    <div className="mt-2 space-y-1.5">
                      {checklistItems.map((item, index) => (
                        <label
                          key={`${item.label}-${index}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5"
                        >
                          <span className="text-xs text-slate-700">{item.label}</span>
                          {canManage ? (
                            <input
                              type="checkbox"
                              checked={Boolean(item.completed)}
                              onChange={() => onToggleChecklistItem(index)}
                            />
                          ) : (
                            renderReadOnlyChecklistStatus(item.completed)
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Blockers
                      {canManage ? (
                        <textarea
                          name="blockers"
                          value={healthForm.blockers}
                          onChange={onHealthInputChange}
                          maxLength={500}
                          rows={2}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                          placeholder="List current blockers and dependencies."
                        />
                      ) : (
                        <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-normal text-slate-700">
                          {healthForm.blockers || "No blockers recorded."}
                        </p>
                      )}
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      Check-in Notes
                      {canManage ? (
                        <textarea
                          name="notes"
                          value={healthForm.notes}
                          onChange={onHealthInputChange}
                          maxLength={1000}
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                          placeholder="Share sprint status, next actions, and support needed."
                        />
                      ) : (
                        <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-normal text-slate-700">
                          {healthForm.notes || "No notes recorded."}
                        </p>
                      )}
                    </label>
                  </div>

                  {canManage ? (
                    <button
                      type="button"
                      onClick={onSaveHealth}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      {updateTeamHealthMutation.isPending ? "Saving Health..." : "Save Health Check-in"}
                    </button>
                  ) : null}
                </>
              )}
            </article>
          ) : null}

          {(showOverview || showRequests) && canViewQr ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Join QR</h2>
                <QrCode className="h-5 w-5 text-teal-700" />
              </div>

              {qrQuery.data ? (
                <>
                  <img src={qrQuery.data.qrCodeDataUrl} alt="Team join QR" className="mx-auto mt-4 h-44 w-44 rounded-xl border border-slate-200 p-2 sm:h-48 sm:w-48" />
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                      Code: {qrQuery.data.joinCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyJoinCode}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-600">Loading QR code...</p>
              )}
            </article>
          ) : null}

          {showRequests && canManage ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Pending Join Requests</h2>

              {pendingRequestsQuery.isLoading ? (
                <p className="mt-2 text-sm text-slate-600">Loading join requests...</p>
              ) : null}

              {!pendingRequestsQuery.isLoading && pendingRequests.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No pending requests.</p>
              ) : null}

              <div className="mt-3 space-y-2">
                {pendingRequests.map((request) => (
                  <div key={request._id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{request.user?.name}</p>
                    <p className="text-xs text-slate-500">{request.user?.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => reviewRequestMutation.mutate({ joinRequestId: request._id, decision: "approve" })}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <UserPlus2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewRequestMutation.mutate({ joinRequestId: request._id, decision: "reject" })}
                        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
