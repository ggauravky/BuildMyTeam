import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function RegisterPage() {
  const navigate = useNavigate();
  const { signup, authError, setAuthError } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await signup(form);
      const approved = response.user.role === "admin" || response.user.status === "approved";
      navigate(approved ? "/dashboard" : "/pending", { replace: true });
    } catch {
      // Error state is managed by AuthContext.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 lg:px-8">
      <div className="grid w-full gap-8 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur lg:grid-cols-2 lg:p-10">
        <section className="rounded-2xl bg-teal-700 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-100">Get started</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Join BuildMyTeam and collaborate smarter.</h1>
          <p className="mt-4 text-sm text-teal-50">
            Your account starts in pending status until your college admin approves access.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900">Create account</h2>
          <p className="mt-1 text-sm text-slate-600">Use your college email to register.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              Full Name
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none ring-teal-500 transition focus:ring"
              />
            </label>

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
                minLength={8}
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
              {submitting ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Already registered?{" "}
            <Link
              to="/login"
              onClick={() => setAuthError("")}
              className="font-semibold text-teal-700 hover:underline"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-xs text-slate-500">
            By creating an account, you agree to the{" "}
            <Link to="/terms" className="font-semibold text-slate-700 hover:underline">
              Terms and Conditions
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
