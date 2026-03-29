import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAuth } from "../hooks/useAuth";

export function PendingPage() {
  const navigate = useNavigate();
  const { user, isApproved, refreshCurrentUser, logout } = useAuth();

  useEffect(() => {
    if (isApproved) {
      navigate("/dashboard", { replace: true });
    }
  }, [isApproved, navigate]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 lg:px-8">
      <div className="w-full rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Approval Required</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Your account is pending admin approval.</h1>
        <p className="mt-3 text-sm text-slate-600">
          You can log in now, but dashboard access unlocks only after approval.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
          <p className="text-sm text-slate-600">Name</p>
          <p className="font-semibold text-slate-900">{user?.name}</p>
          <p className="mt-3 text-sm text-slate-600">Email</p>
          <p className="font-semibold text-slate-900">{user?.email}</p>
          <p className="mt-3 text-sm text-slate-600">Status</p>
          <div className="mt-1">
            <StatusBadge value={user?.status} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/teams")}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Browse Teams
          </button>
          <button
            type="button"
            onClick={refreshCurrentUser}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Check Approval Status
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
