import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, QrCode, ShieldCheck, UserMinus, UserPlus2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { hackathonApi } from "../api/hackathon.api";
import { joinRequestApi } from "../api/joinRequest.api";
import { teamApi } from "../api/team.api";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAuth } from "../hooks/useAuth";

function getMemberUserId(member) {
  if (!member || !member.user) {
    return "";
  }

  return typeof member.user === "string" ? member.user : member.user._id;
}

const EMPTY_FORM = {
  name: "",
  projectName: "",
  hackathonLink: "",
  githubLink: "",
  excalidrawLink: "",
  whatsappLink: "",
  maxSize: 4,
  hackathonId: "",
};

export function TeamWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  const [message, setMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newLeaderId, setNewLeaderId] = useState("");

  const teamQuery = useQuery({
    queryKey: ["team", id],
    queryFn: () => teamApi.getById(id),
  });

  const hackathonsQuery = useQuery({
    queryKey: ["hackathons-team-edit"],
    queryFn: () => hackathonApi.list(),
  });

  const team = teamQuery.data?.team;

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

  const canManage = Boolean(isAdmin || (user && creatorId === user.id));
  const canViewQr = Boolean(isAdmin || myMembership);

  const teamDerivedForm = useMemo(() => {
    if (!team) {
      return EMPTY_FORM;
    }

    return {
      name: team.name,
      projectName: team.projectName,
      hackathonLink: team.hackathonLink,
      githubLink: team.links.github,
      excalidrawLink: team.links.excalidraw,
      whatsappLink: team.links.whatsapp,
      maxSize: team.maxSize,
      hackathonId: team.hackathon?._id || "",
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

  const updateTeamMutation = useMutation({
    mutationFn: (payload) => teamApi.update(id, payload),
    onSuccess: () => {
      setMessage("Team details updated.");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to update team.");
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

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onUpdateSubmit = (event) => {
    event.preventDefault();

    updateTeamMutation.mutate({
      name: form.name,
      projectName: form.projectName,
      hackathonLink: form.hackathonLink,
      githubLink: form.githubLink,
      excalidrawLink: form.excalidrawLink,
      whatsappLink: form.whatsappLink,
      maxSize: Number(form.maxSize),
      hackathonId: form.hackathonId || null,
    });
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

  if (!team) {
    return <EmptyState title="Team not found" subtitle="This team does not exist or is no longer available." />;
  }

  const pendingRequests = pendingRequestsQuery.data?.requests || [];
  const hackathons = hackathonsQuery.data?.hackathons || [];

  return (
    <div>
      <PageHeader
        title={team.name}
        description={`Project: ${team.projectName} | Members ${team.members.length}/${team.maxSize}`}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onToggleEditMode}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {editMode ? "Cancel Edit" : "Edit Team"}
              </button>
              <button
                type="button"
                onClick={onDeleteTeam}
                className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                {deleteTeamMutation.isPending ? "Deleting..." : "Delete Team"}
              </button>
            </div>
          ) : null
        }
      />

      {message ? <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Team Resources</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <a href={team.links.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-teal-700 hover:underline">
                <Link2 className="h-4 w-4" /> GitHub Repository
              </a>
              <a href={team.links.excalidraw} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-teal-700 hover:underline">
                <Link2 className="h-4 w-4" /> Excalidraw Board
              </a>
              <a href={team.links.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-teal-700 hover:underline">
                <Link2 className="h-4 w-4" /> WhatsApp Group
              </a>
            </div>
          </article>

          {editMode ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Edit Team Details</h3>
              <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onUpdateSubmit}>
                <input name="name" value={form.name} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Team Name" />
                <input name="projectName" value={form.projectName} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Project Name" />
                <select name="hackathonId" value={form.hackathonId} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">No linked hackathon</option>
                  {hackathons.map((hackathon) => (
                    <option key={hackathon._id} value={hackathon._id}>
                      {hackathon.title}
                    </option>
                  ))}
                </select>
                <input type="number" min={2} max={20} name="maxSize" value={form.maxSize} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Max team size" />
                <input type="url" name="hackathonLink" value={form.hackathonLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Hackathon Link" />
                <input type="url" name="githubLink" value={form.githubLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="GitHub Link" />
                <input type="url" name="excalidrawLink" value={form.excalidrawLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Excalidraw Link" />
                <input type="url" name="whatsappLink" value={form.whatsappLink} onChange={onFormChange} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="WhatsApp Link" />
                <button type="submit" className="md:col-span-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                  {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </article>
          ) : null}

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Members</h2>
            <ul className="mt-3 space-y-2">
              {team.members.map((member) => {
                const memberId = getMemberUserId(member);
                const isLeader = member.role === "leader";

                return (
                  <li key={memberId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{member.user?.name || "Unknown User"}</p>
                      <p className="text-xs text-slate-500">{member.user?.email || "No email"}</p>
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
                  </li>
                );
              })}
            </ul>
          </article>

          {canManage ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Transfer Team Leader</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <select
                  value={newLeaderId}
                  onChange={(event) => setNewLeaderId(event.target.value)}
                  className="min-w-52 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
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
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Transfer
                </button>
              </div>
            </article>
          ) : null}
        </div>

        <div className="space-y-4">
          {canViewQr ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Join QR</h2>
                <QrCode className="h-5 w-5 text-teal-700" />
              </div>

              {qrQuery.data ? (
                <>
                  <img src={qrQuery.data.qrCodeDataUrl} alt="Team join QR" className="mx-auto mt-4 h-48 w-48 rounded-xl border border-slate-200 p-2" />
                  <div className="mt-4 flex items-center justify-center gap-2">
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

          {canManage ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
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
                    <div className="mt-2 flex gap-2">
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
