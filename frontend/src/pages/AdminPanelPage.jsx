import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "../api/admin.api";
import { hackathonApi } from "../api/hackathon.api";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";

const initialHackathon = {
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

export function AdminPanelPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [hackathonForm, setHackathonForm] = useState(initialHackathon);
  const [editingHackathonId, setEditingHackathonId] = useState("");
  const [hackathonEditForm, setHackathonEditForm] = useState(initialHackathon);
  const [message, setMessage] = useState("");

  const pendingUsersQuery = useQuery({
    queryKey: ["admin-pending-users"],
    queryFn: () => adminApi.listUsers({ status: "pending", limit: 100, page: 1 }),
    refetchInterval: 15000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", statusFilter],
    queryFn: () => adminApi.listUsers(statusFilter ? { status: statusFilter } : {}),
  });

  const teamsQuery = useQuery({
    queryKey: ["admin-teams"],
    queryFn: () => adminApi.listTeams(),
  });

  const hackathonsQuery = useQuery({
    queryKey: ["admin-hackathons"],
    queryFn: () => adminApi.listHackathons(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateUserStatus(id, { status }),
    onSuccess: () => {
      setMessage("User status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Unable to update user status.");
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

  const users = usersQuery.data?.users || [];
  const pendingUsers = pendingUsersQuery.data?.users || [];
  const teams = teamsQuery.data?.teams || [];
  const hackathons = hackathonsQuery.data?.hackathons || [];

  return (
    <div>
      <PageHeader title="Admin Panel" description="Approve users, monitor teams, and manage hackathon listings." />

      {message ? <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p> : null}

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
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

              <div className="mt-2 flex gap-2">
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

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">User Approvals</h2>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="">All statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

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
                    <p className="text-xs text-slate-500">{item.email}</p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>

                {item.status === "pending" ? (
                  <div className="mt-2 flex gap-2">
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
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Create Hackathon</h2>

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
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">All Teams Overview</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <div key={team._id} className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">{team.name}</p>
              <p className="text-xs text-slate-500">Leader: {team.leader?.name || "Unknown"}</p>
              <p className="text-xs text-slate-500">Members: {team.members.length}/{team.maxSize}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
