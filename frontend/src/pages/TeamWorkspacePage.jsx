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

const TASK_COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const DEFAULT_TASK_DRAFT = {
  title: "",
  description: "",
  priority: "medium",
  status: "backlog",
  assigneeId: "",
  dueDate: "",
  estimateHours: "",
};

const DEFAULT_DECISION_DRAFT = {
  title: "",
  summary: "",
  ownerId: "",
  status: "proposed",
  category: "",
  impact: "",
};

const DEFAULT_OWNERSHIP_DRAFT = {
  area: "",
  ownerId: "",
  backupOwnerId: "",
  responsibilities: "",
};

const DEFAULT_TRIAGE_TEMPLATE = "skills_mismatch";

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
  const [taskDraft, setTaskDraft] = useState(DEFAULT_TASK_DRAFT);
  const [decisionDraft, setDecisionDraft] = useState(DEFAULT_DECISION_DRAFT);
  const [ownershipDraft, setOwnershipDraft] = useState(DEFAULT_OWNERSHIP_DRAFT);
  const [capacityDraftByMember, setCapacityDraftByMember] = useState({});
  const [triageDraftByRequest, setTriageDraftByRequest] = useState({});

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

  const actionCenterQuery = useQuery({
    queryKey: ["team-action-center", id],
    queryFn: () => teamApi.getActionCenter(id),
    enabled: canViewHealth,
  });

  const taskBoardQuery = useQuery({
    queryKey: ["team-task-board", id],
    queryFn: () => teamApi.listTasks(id),
    enabled: canViewHealth,
  });

  const capacityQuery = useQuery({
    queryKey: ["team-capacity", id],
    queryFn: () => teamApi.getCapacity(id),
    enabled: canViewHealth,
  });

  const onboardingPackQuery = useQuery({
    queryKey: ["team-onboarding-pack", id],
    queryFn: () => teamApi.listOnboardingPack(id),
    enabled: canViewHealth,
  });

  const decisionLogQuery = useQuery({
    queryKey: ["team-decision-log", id],
    queryFn: () => teamApi.listDecisionLog(id),
    enabled: canViewHealth,
  });

  const ownershipLedgerQuery = useQuery({
    queryKey: ["team-ownership-ledger", id],
    queryFn: () => teamApi.listOwnershipLedger(id),
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
    mutationFn: ({ joinRequestId, decision, reasonTemplate, note }) =>
      joinRequestApi.review(joinRequestId, {
        decision,
        reasonTemplate,
        note,
      }),
    onSuccess: () => {
      setMessage("Join request updated.");
      queryClient.invalidateQueries({ queryKey: ["team-pending-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["team-action-center", id] });
      queryClient.invalidateQueries({ queryKey: ["team-onboarding-pack", id] });
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

  const createTaskMutation = useMutation({
    mutationFn: (payload) => teamApi.createTask(id, payload),
    onSuccess: () => {
      setMessage("Task created.");
      setTaskDraft(DEFAULT_TASK_DRAFT);
      queryClient.invalidateQueries({ queryKey: ["team-task-board", id] });
      queryClient.invalidateQueries({ queryKey: ["team-action-center", id] });
      queryClient.invalidateQueries({ queryKey: ["team-capacity", id] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to create task.");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }) => teamApi.updateTask(id, taskId, payload),
    onSuccess: () => {
      setMessage("Task updated.");
      queryClient.invalidateQueries({ queryKey: ["team-task-board", id] });
      queryClient.invalidateQueries({ queryKey: ["team-action-center", id] });
      queryClient.invalidateQueries({ queryKey: ["team-capacity", id] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to update task.");
    },
  });

  const updateCapacityMutation = useMutation({
    mutationFn: ({ memberId, payload }) => teamApi.updateCapacity(id, memberId, payload),
    onSuccess: () => {
      setMessage("Capacity updated.");
      queryClient.invalidateQueries({ queryKey: ["team-capacity", id] });
      queryClient.invalidateQueries({ queryKey: ["team-action-center", id] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to update capacity.");
    },
  });

  const initOnboardingMutation = useMutation({
    mutationFn: (memberId) => teamApi.initOnboardingPack(id, memberId),
    onSuccess: () => {
      setMessage("Onboarding pack initialized.");
      queryClient.invalidateQueries({ queryKey: ["team-onboarding-pack", id] });
      queryClient.invalidateQueries({ queryKey: ["team-action-center", id] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to initialize onboarding pack.");
    },
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: ({ recordId, payload }) => teamApi.updateOnboardingPack(id, recordId, payload),
    onSuccess: () => {
      setMessage("Onboarding pack updated.");
      queryClient.invalidateQueries({ queryKey: ["team-onboarding-pack", id] });
      queryClient.invalidateQueries({ queryKey: ["team-action-center", id] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to update onboarding pack.");
    },
  });

  const createDecisionMutation = useMutation({
    mutationFn: (payload) => teamApi.createDecisionLog(id, payload),
    onSuccess: () => {
      setMessage("Decision logged.");
      setDecisionDraft(DEFAULT_DECISION_DRAFT);
      queryClient.invalidateQueries({ queryKey: ["team-decision-log", id] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to log decision.");
    },
  });

  const createOwnershipMutation = useMutation({
    mutationFn: (payload) => teamApi.createOwnershipEntry(id, payload),
    onSuccess: () => {
      setMessage("Ownership entry added.");
      setOwnershipDraft(DEFAULT_OWNERSHIP_DRAFT);
      queryClient.invalidateQueries({ queryKey: ["team-ownership-ledger", id] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to add ownership entry.");
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

  const onTaskDraftChange = (event) => {
    const { name, value } = event.target;
    setTaskDraft((prev) => ({ ...prev, [name]: value }));
  };

  const onCreateTask = (event) => {
    event.preventDefault();

    if (!taskDraft.title.trim()) {
      setMessage("Task title is required.");
      return;
    }

    createTaskMutation.mutate({
      title: taskDraft.title.trim(),
      description: taskDraft.description.trim(),
      priority: taskDraft.priority,
      status: taskDraft.status,
      assigneeId: taskDraft.assigneeId || null,
      dueDate: taskDraft.dueDate ? new Date(taskDraft.dueDate).toISOString() : null,
      estimateHours: taskDraft.estimateHours ? Number(taskDraft.estimateHours) : null,
    });
  };

  const onMoveTask = (taskId, status) => {
    updateTaskMutation.mutate({ taskId, payload: { status } });
  };

  const onCapacityFieldChange = (memberId, field, value) => {
    setCapacityDraftByMember((prev) => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [field]: value,
      },
    }));
  };

  const onSaveCapacity = (memberId, memberSnapshot) => {
    const draft = capacityDraftByMember[memberId] || {};

    updateCapacityMutation.mutate({
      memberId,
      payload: {
        timezone: draft.timezone ?? memberSnapshot.timezone,
        preferredRole: draft.preferredRole ?? memberSnapshot.preferredRole,
        weeklyCapacityHours: Number(draft.weeklyCapacityHours ?? memberSnapshot.weeklyCapacityHours),
        currentLoadHours: Number(draft.baselineLoadHours ?? memberSnapshot.baselineLoadHours),
      },
    });
  };

  const onInitOnboardingForMember = (memberId) => {
    initOnboardingMutation.mutate(memberId);
  };

  const onToggleOnboardingChecklist = (record, itemIndex) => {
    const nextChecklist = (record.checklist || []).map((item, index) => {
      if (index !== itemIndex) {
        return item;
      }

      const nextCompleted = !item.completed;

      return {
        ...item,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : null,
      };
    });

    updateOnboardingMutation.mutate({
      recordId: record._id,
      payload: { checklist: nextChecklist },
    });
  };

  const onDecisionDraftChange = (event) => {
    const { name, value } = event.target;
    setDecisionDraft((prev) => ({ ...prev, [name]: value }));
  };

  const onCreateDecision = (event) => {
    event.preventDefault();

    if (!decisionDraft.title.trim() || !decisionDraft.summary.trim() || !decisionDraft.ownerId) {
      setMessage("Decision title, summary, and owner are required.");
      return;
    }

    createDecisionMutation.mutate({
      title: decisionDraft.title.trim(),
      summary: decisionDraft.summary.trim(),
      ownerId: decisionDraft.ownerId,
      status: decisionDraft.status,
      category: decisionDraft.category.trim(),
      impact: decisionDraft.impact.trim(),
    });
  };

  const onOwnershipDraftChange = (event) => {
    const { name, value } = event.target;
    setOwnershipDraft((prev) => ({ ...prev, [name]: value }));
  };

  const onCreateOwnershipEntry = (event) => {
    event.preventDefault();

    if (!ownershipDraft.area.trim() || !ownershipDraft.ownerId) {
      setMessage("Ownership area and owner are required.");
      return;
    }

    const responsibilities = ownershipDraft.responsibilities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    createOwnershipMutation.mutate({
      area: ownershipDraft.area.trim(),
      ownerId: ownershipDraft.ownerId,
      backupOwnerId: ownershipDraft.backupOwnerId || null,
      responsibilities,
    });
  };

  const onUpdateTriageDraft = (joinRequestId, field, value) => {
    setTriageDraftByRequest((prev) => ({
      ...prev,
      [joinRequestId]: {
        reasonTemplate: DEFAULT_TRIAGE_TEMPLATE,
        note: "",
        ...(prev[joinRequestId] || {}),
        [field]: value,
      },
    }));
  };

  const onTriageDecision = (joinRequestId, decision) => {
    const triageDraft = triageDraftByRequest[joinRequestId] || {
      reasonTemplate: DEFAULT_TRIAGE_TEMPLATE,
      note: "",
    };

    reviewRequestMutation.mutate({
      joinRequestId,
      decision,
      reasonTemplate: decision === "reject" ? triageDraft.reasonTemplate : undefined,
      note: triageDraft.note || undefined,
    });
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
  const triageReasonTemplates = pendingRequestsQuery.data?.reasonTemplates || [];
  const actionCenterSummary = actionCenterQuery.data?.summary || {};
  const actionCenterCards = actionCenterQuery.data?.cards || [];
  const taskBoard = taskBoardQuery.data?.tasks || [];
  const capacityMembers = capacityQuery.data?.members || [];
  const onboardingRecords = onboardingPackQuery.data?.records || [];
  const decisionLogEntries = decisionLogQuery.data?.decisions || [];
  const ownershipEntries = ownershipLedgerQuery.data?.entries || [];
  const hackathons = hackathonsQuery.data?.hackathons || [];
  const events = eventsQuery.data?.events || [];
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "action-center", label: "Today" },
    { id: "tasks", label: "Task Board" },
    { id: "capacity", label: "Capacity" },
    { id: "onboarding", label: "Onboarding Pack" },
    { id: "ledger", label: "Decision Ledger" },
    { id: "members", label: `Members (${team.members.length})` },
    ...(canManage ? [{ id: "requests", label: `Triage (${pendingRequests.length})` }] : []),
    ...(canManage ? [{ id: "settings", label: "Settings" }] : []),
  ];

  const currentTab =
    !canManage && (activeTab === "requests" || activeTab === "settings")
      ? "overview"
      : activeTab;

  const showOverview = currentTab === "overview";
  const showActionCenter = currentTab === "action-center";
  const showTasks = currentTab === "tasks";
  const showCapacity = currentTab === "capacity";
  const showOnboarding = currentTab === "onboarding";
  const showLedger = currentTab === "ledger";
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
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Tasks Due Today</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{actionCenterSummary.tasksDueToday || 0}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Triage</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{actionCenterSummary.pendingRequests || 0}</p>
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
          {showActionCenter ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Today Action Center</h2>
              <p className="mt-1 text-sm text-slate-600">Focus queue for triage, workload risk, and delivery blockers.</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Overdue Tasks</p>
                  <p className="text-lg font-semibold text-slate-900">{actionCenterSummary.overdueTasks || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Unassigned</p>
                  <p className="text-lg font-semibold text-slate-900">{actionCenterSummary.unassignedTasks || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Interview Queue</p>
                  <p className="text-lg font-semibold text-slate-900">{actionCenterSummary.triageInterview || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Capacity Risk</p>
                  <p className="text-lg font-semibold text-slate-900">{actionCenterSummary.overloadedMembers || 0}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {actionCenterCards.length === 0 ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    No urgent actions right now. Team flow is stable.
                  </p>
                ) : (
                  actionCenterCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setActiveTab(card.targetTab || "overview")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
                    >
                      <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{card.description}</p>
                    </button>
                  ))
                )}
              </div>
            </article>
          ) : null}

          {showTasks ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Task Board</h2>

              {canManage ? (
                <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={onCreateTask}>
                  <input
                    name="title"
                    value={taskDraft.title}
                    onChange={onTaskDraftChange}
                    placeholder="Task title"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    name="assigneeId"
                    value={taskDraft.assigneeId}
                    onChange={onTaskDraftChange}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {team.members.map((member) => (
                      <option key={getMemberUserId(member)} value={getMemberUserId(member)}>
                        {member.user?.name || "Unknown"}
                      </option>
                    ))}
                  </select>
                  <textarea
                    name="description"
                    value={taskDraft.description}
                    onChange={onTaskDraftChange}
                    rows={2}
                    placeholder="Short task description"
                    className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    name="priority"
                    value={taskDraft.priority}
                    onChange={onTaskDraftChange}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select
                    name="status"
                    value={taskDraft.status}
                    onChange={onTaskDraftChange}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {TASK_COLUMNS.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    name="dueDate"
                    value={taskDraft.dueDate}
                    onChange={onTaskDraftChange}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    name="estimateHours"
                    value={taskDraft.estimateHours}
                    onChange={onTaskDraftChange}
                    placeholder="Estimate hours"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="md:col-span-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    {createTaskMutation.isPending ? "Creating..." : "Add Task"}
                  </button>
                </form>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {TASK_COLUMNS.map((column) => {
                  const columnTasks = taskBoard.filter((task) => task.status === column.id);

                  return (
                    <div key={column.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">{column.label}</h3>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {columnTasks.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {columnTasks.map((task) => (
                          <div key={task._id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                            <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                            {task.description ? (
                              <p className="mt-0.5 text-xs text-slate-600">{task.description}</p>
                            ) : null}
                            <div className="mt-1.5 text-xs text-slate-500">
                              <p>Assignee: {task.assignee?.name || "Unassigned"}</p>
                              <p>Priority: {task.priority}</p>
                              <p>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</p>
                            </div>

                            {canManage ? (
                              <div className="mt-2 grid grid-cols-2 gap-1">
                                {TASK_COLUMNS.filter((statusOption) => statusOption.id !== task.status).map((statusOption) => (
                                  <button
                                    key={`${task._id}-${statusOption.id}`}
                                    type="button"
                                    onClick={() => onMoveTask(task._id, statusOption.id)}
                                    className="rounded-md border border-slate-200 px-1.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    {statusOption.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}

                        {columnTasks.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-2 py-3 text-center text-xs text-slate-500">
                            No tasks
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ) : null}

          {showCapacity ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Capacity</h2>
              <p className="mt-1 text-sm text-slate-600">Weekly bandwidth and utilization per teammate.</p>

              <div className="mt-3 space-y-3">
                {capacityMembers.map((member) => {
                  const memberId = member.memberId;
                  const draft = capacityDraftByMember[memberId] || {};

                  return (
                    <div key={memberId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                        <span className="text-xs font-semibold text-slate-600">{member.utilizationPercent}% utilized</span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full ${member.utilizationPercent >= 100 ? "bg-rose-500" : member.utilizationPercent >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(member.utilizationPercent, 100)}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-600">
                        Load {member.currentLoadHours}h / Capacity {member.weeklyCapacityHours}h | Tasks {member.assignedTaskCount}
                      </p>

                      {canManage ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <input
                            value={draft.timezone ?? member.timezone}
                            onChange={(event) => onCapacityFieldChange(memberId, "timezone", event.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="Timezone"
                          />
                          <input
                            type="number"
                            min={1}
                            value={draft.weeklyCapacityHours ?? member.weeklyCapacityHours}
                            onChange={(event) => onCapacityFieldChange(memberId, "weeklyCapacityHours", event.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="Capacity h"
                          />
                          <input
                            type="number"
                            min={0}
                            value={draft.baselineLoadHours ?? member.baselineLoadHours}
                            onChange={(event) => onCapacityFieldChange(memberId, "baselineLoadHours", event.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="Baseline load h"
                          />
                          <input
                            value={draft.preferredRole ?? member.preferredRole}
                            onChange={(event) => onCapacityFieldChange(memberId, "preferredRole", event.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="Preferred role"
                          />
                        </div>
                      ) : null}

                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => onSaveCapacity(memberId, member)}
                          className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {updateCapacityMutation.isPending ? "Saving..." : "Save Capacity"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}

                {capacityMembers.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                    No capacity data yet.
                  </p>
                ) : null}
              </div>
            </article>
          ) : null}

          {showOnboarding ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Onboarding Pack</h2>
              <p className="mt-1 text-sm text-slate-600">Track readiness of newly joined teammates.</p>

              {canManage ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {team.members.map((member) => {
                    const memberId = getMemberUserId(member);
                    const hasRecord = onboardingRecords.some((record) => record.user?._id === memberId);

                    if (hasRecord) {
                      return null;
                    }

                    return (
                      <button
                        key={`init-onboarding-${memberId}`}
                        type="button"
                        onClick={() => onInitOnboardingForMember(memberId)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Init {member.user?.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-3 space-y-3">
                {onboardingRecords.map((record) => (
                  <div key={record._id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{record.user?.name || "Team member"}</p>
                      <span className="text-xs font-semibold text-slate-600">
                        {record.completedAt ? "Completed" : "In Progress"}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {(record.checklist || []).map((item, index) => (
                        <label
                          key={`${record._id}-${item.key}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                        >
                          <span className="text-xs text-slate-700">{item.label}</span>
                          {canManage ? (
                            <input
                              type="checkbox"
                              checked={Boolean(item.completed)}
                              onChange={() => onToggleOnboardingChecklist(record, index)}
                            />
                          ) : (
                            renderReadOnlyChecklistStatus(item.completed)
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {onboardingRecords.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                    No onboarding packs started yet.
                  </p>
                ) : null}
              </div>
            </article>
          ) : null}

          {showLedger ? (
            <>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-slate-900">Decision Log</h2>

                {canManage ? (
                  <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={onCreateDecision}>
                    <input
                      name="title"
                      value={decisionDraft.title}
                      onChange={onDecisionDraftChange}
                      placeholder="Decision title"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <select
                      name="ownerId"
                      value={decisionDraft.ownerId}
                      onChange={onDecisionDraftChange}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select owner</option>
                      {team.members.map((member) => (
                        <option key={`decision-owner-${getMemberUserId(member)}`} value={getMemberUserId(member)}>
                          {member.user?.name || "Unknown"}
                        </option>
                      ))}
                    </select>
                    <textarea
                      name="summary"
                      value={decisionDraft.summary}
                      onChange={onDecisionDraftChange}
                      rows={2}
                      placeholder="Decision summary"
                      className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="category"
                      value={decisionDraft.category}
                      onChange={onDecisionDraftChange}
                      placeholder="Category"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="impact"
                      value={decisionDraft.impact}
                      onChange={onDecisionDraftChange}
                      placeholder="Impact"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="md:col-span-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      {createDecisionMutation.isPending ? "Saving..." : "Add Decision"}
                    </button>
                  </form>
                ) : null}

                <div className="mt-3 space-y-2">
                  {decisionLogEntries.map((entry) => (
                    <div key={entry._id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                        <StatusBadge value={entry.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-700">{entry.summary}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Owner: {entry.owner?.name || "-"} | {entry.category || "General"} | {formatDateTime(entry.decidedAt)}
                      </p>
                    </div>
                  ))}
                  {decisionLogEntries.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                      No decisions logged yet.
                    </p>
                  ) : null}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-slate-900">Ownership Ledger</h2>

                {canManage ? (
                  <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={onCreateOwnershipEntry}>
                    <input
                      name="area"
                      value={ownershipDraft.area}
                      onChange={onOwnershipDraftChange}
                      placeholder="Area (e.g. Backend APIs)"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <select
                      name="ownerId"
                      value={ownershipDraft.ownerId}
                      onChange={onOwnershipDraftChange}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Primary owner</option>
                      {team.members.map((member) => (
                        <option key={`owner-${getMemberUserId(member)}`} value={getMemberUserId(member)}>
                          {member.user?.name || "Unknown"}
                        </option>
                      ))}
                    </select>
                    <select
                      name="backupOwnerId"
                      value={ownershipDraft.backupOwnerId}
                      onChange={onOwnershipDraftChange}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Backup owner (optional)</option>
                      {team.members.map((member) => (
                        <option key={`backup-${getMemberUserId(member)}`} value={getMemberUserId(member)}>
                          {member.user?.name || "Unknown"}
                        </option>
                      ))}
                    </select>
                    <input
                      name="responsibilities"
                      value={ownershipDraft.responsibilities}
                      onChange={onOwnershipDraftChange}
                      placeholder="Responsibilities (comma separated)"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="md:col-span-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {createOwnershipMutation.isPending ? "Saving..." : "Add Ownership"}
                    </button>
                  </form>
                ) : null}

                <div className="mt-3 space-y-2">
                  {ownershipEntries.map((entry) => (
                    <div key={entry._id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-sm font-semibold text-slate-900">{entry.area}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Owner: {entry.owner?.name || "-"}
                        {entry.backupOwner ? ` | Backup: ${entry.backupOwner.name}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(entry.responsibilities || []).length
                          ? entry.responsibilities.join(", ")
                          : "No explicit responsibilities listed."}
                      </p>
                    </div>
                  ))}
                  {ownershipEntries.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                      No ownership entries yet.
                    </p>
                  ) : null}
                </div>
              </article>
            </>
          ) : null}

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
              <h2 className="text-lg font-semibold text-slate-900">Triage Queue</h2>
              <p className="mt-1 text-sm text-slate-600">
                Run shortlist, interview, approve, and reject decisions with rationale.
              </p>

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
                    <p className="mt-1 text-xs text-slate-500">
                      Stage: {String(request.triageStage || "new").replaceAll("_", " ")} | Profile Strength: {request.triageMeta?.profileStrengthScore || 0}/100
                    </p>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <select
                        value={triageDraftByRequest[request._id]?.reasonTemplate || DEFAULT_TRIAGE_TEMPLATE}
                        onChange={(event) => onUpdateTriageDraft(request._id, "reasonTemplate", event.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                      >
                        {(triageReasonTemplates.length ? triageReasonTemplates : [{ key: DEFAULT_TRIAGE_TEMPLATE, label: "Skills mismatch" }]).map((template) => (
                          <option key={`${request._id}-${template.key}`} value={template.key}>
                            {template.label}
                          </option>
                        ))}
                      </select>

                      <input
                        value={triageDraftByRequest[request._id]?.note || ""}
                        onChange={(event) => onUpdateTriageDraft(request._id, "note", event.target.value)}
                        placeholder="Triage note"
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onTriageDecision(request._id, "shortlist")}
                        className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Shortlist
                      </button>
                      <button
                        type="button"
                        onClick={() => onTriageDecision(request._id, "interview")}
                        className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        Interview
                      </button>
                      <button
                        type="button"
                        onClick={() => onTriageDecision(request._id, "approve")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <UserPlus2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onTriageDecision(request._id, "reject")}
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
