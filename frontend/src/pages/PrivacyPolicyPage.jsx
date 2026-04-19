import { Link } from "react-router-dom";

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 lg:px-8">
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">BuildMyTeam</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-600">Effective date: April 19, 2026</p>

        <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
          <section>
            <h2 className="text-base font-semibold text-slate-900">Information We Collect</h2>
            <p className="mt-1">
              We collect account details you provide (name, email, profile data), collaboration metadata
              (team membership, join request activity, task updates), and operational logs required for
              product security and abuse prevention.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">How We Use Information</h2>
            <p className="mt-1">
              Your information is used to provide core features such as team discovery, workspace access,
              notifications, moderation workflows, and support troubleshooting.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Data Sharing</h2>
            <p className="mt-1">
              We do not sell personal data. Data may be shared with service providers that host or secure
              the product, and where legally required.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Retention and Security</h2>
            <p className="mt-1">
              We retain data while accounts are active or as required for legitimate operational and legal
              purposes. Reasonable safeguards are used to protect account and workspace information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Your Choices</h2>
            <p className="mt-1">
              You can update profile information, notification preferences, and visibility settings from
              your account. You may request account deletion by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Contact</h2>
            <p className="mt-1">Questions about privacy can be sent to the project maintainer.</p>
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
            to="/terms"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Read Terms
          </Link>
        </div>
      </article>
    </div>
  );
}
