import { Link } from "react-router-dom";

export function TermsPage() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 lg:px-8">
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">BuildMyTeam</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Terms and Conditions</h1>
        <p className="mt-2 text-sm text-slate-600">Effective date: April 19, 2026</p>

        <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
          <section>
            <h2 className="text-base font-semibold text-slate-900">Use of Service</h2>
            <p className="mt-1">
              BuildMyTeam is provided for educational and collaboration use. You agree to provide accurate
              account information and to use the platform lawfully.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Account Responsibility</h2>
            <p className="mt-1">
              You are responsible for maintaining the confidentiality of your credentials and for activity
              under your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Acceptable Conduct</h2>
            <p className="mt-1">
              You must not misuse the service, attempt unauthorized access, upload harmful content, or
              engage in harassment, impersonation, or abuse.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Moderation and Enforcement</h2>
            <p className="mt-1">
              Accounts may be warned, suspended, or removed for policy violations. Team management actions
              can be restricted to preserve platform safety.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Service Changes</h2>
            <p className="mt-1">
              Features may evolve over time. We may update or discontinue parts of the service and revise
              these terms when required.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Limitation of Liability</h2>
            <p className="mt-1">
              The service is provided on an as-is basis without guarantees of uninterrupted availability.
              To the extent permitted by law, liability is limited for indirect or consequential damages.
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Home
          </Link>
          <Link
            to="/privacy"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Read Privacy Policy
          </Link>
        </div>
      </article>
    </div>
  );
}
