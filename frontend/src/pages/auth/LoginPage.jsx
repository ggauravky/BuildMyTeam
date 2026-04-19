import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, authError, setAuthError } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await login(form);
      const approved = response.user.role === "admin" || response.user.status === "approved";
      const code = searchParams.get("code");

      if (approved && code) {
        navigate(`/teams?code=${code}`, { replace: true });
      } else {
        navigate(approved ? "/dashboard" : "/pending", { replace: true });
      }
    } catch {
      // Error state is managed by AuthContext.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 lg:px-8">
      <div className="grid w-full gap-8 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur lg:grid-cols-2 lg:p-10">
        <section className="rounded-2xl bg-slate-900 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-300">BuildMyTeam</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Coordinate hackathons, teams, and progress in one place.</h1>
          <p className="mt-4 text-sm text-slate-200">
            Leaders create teams, members request to join with a code, and admins keep participation clean and approved.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">Access your workspace and continue collaborating.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none ring-teal-500 transition focus:ring"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input
                type="password"
                name="password"
                required
                value={form.password}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none ring-teal-500 transition focus:ring"
              />
            </label>

            {authError ? <p className="text-sm text-rose-700">{authError}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            New here?{" "}
            <Link
              to="/register"
              onClick={() => setAuthError("")}
              className="font-semibold text-teal-700 hover:underline"
            >
              Create an account
            </Link>
          </p>

          <p className="mt-3 text-xs text-slate-500">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="font-semibold text-slate-700 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-semibold text-slate-700 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
