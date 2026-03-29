import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8 lg:px-8">
      <div className="w-full rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">The page you are looking for does not exist.</p>

        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
