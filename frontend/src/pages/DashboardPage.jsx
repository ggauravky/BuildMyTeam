import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Flag, Users } from "lucide-react";
import { createElement, useState } from "react";
import { joinRequestApi } from "../api/joinRequest.api";
import { teamApi } from "../api/team.api";
import { PageHeader } from "../components/common/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";

function StatCard({ label, value, icon, tone }) {
  const toneClass = {
    teal: "bg-teal-50 border-teal-100 text-teal-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  }[tone];

  return (
    <article className={`rounded-2xl border p-4 sm:p-5 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        {createElement(icon, { className: "h-5 w-5" })}
      </div>
      <p className="mt-3 text-2xl font-bold sm:text-3xl">{value}</p>
    </article>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [requestFeedback, setRequestFeedback] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => teamApi.listMine(),
  });

  const requestsQuery = useQuery({
    queryKey: ["my-join-requests"],
    queryFn: () => joinRequestApi.listMine(),
  });

  const cancelJoinRequestMutation = useMutation({
    mutationFn: (requestId) => joinRequestApi.cancel(requestId),
    onSuccess: () => {
      setRequestFeedback("Join request cancelled successfully.");
      queryClient.invalidateQueries({ queryKey: ["my-join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      setRequestFeedback(error.response?.data?.message || "Unable to cancel join request.");
    },
  });

  const teams = teamsQuery.data?.teams || [];
  const requests = requestsQuery.data?.requests || [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Track your teams, join requests, and updates at a glance."
      />

      <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard label="Teams Joined" value={teams.length} icon={Users} tone="teal" />
        <StatCard label="My Join Requests" value={requests.length} icon={Flag} tone="amber" />
        <StatCard
          label="Unread Notifications"
          value={notifications.filter((item) => !item.isRead).length}
          icon={BellRing}
          tone="blue"
        />
      </section>

      <section className="mt-5 grid gap-4 lg:mt-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Your Role</h3>
          <p className="mt-2 text-sm text-slate-600">
            Global role: <span className="font-semibold capitalize text-slate-900">{user?.role}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Account status: <span className="font-semibold capitalize text-slate-900">{user?.status}</span>
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Recent Team Requests</h3>

          {requestFeedback ? (
            <p className="mt-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700">
              {requestFeedback}
            </p>
          ) : null}

          {requests.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No join requests created yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {requests.slice(0, 4).map((request) => (
                <li key={request._id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      <span className="font-semibold text-slate-900">{request.team?.name || "Unknown team"}</span>{" "}
                      <span className="capitalize">{request.status}</span>
                    </p>

                    {request.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => cancelJoinRequestMutation.mutate(request._id)}
                        className="self-start rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        {cancelJoinRequestMutation.isPending ? "Cancelling..." : "Cancel Request"}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
