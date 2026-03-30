import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { hackathonApi } from "../api/hackathon.api";
import { EmptyState } from "../components/common/EmptyState";
import { useAuth } from "../hooks/useAuth";

export function HomePage() {
  const { isAuthenticated, isApproved } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["hackathons-home"],
    queryFn: () => hackathonApi.list(),
  });

  const hackathons = data?.hackathons || [];

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-700">BuildMyTeam</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Build stronger hackathon teams.</h1>
        <p className="mt-4 max-w-3xl text-sm text-slate-600 lg:text-base">
          Discover college hackathons, create project teams, manage collaboration links, and track participation from a single platform.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <Link
              to={isApproved ? "/dashboard" : "/pending"}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Upcoming Hackathons</h2>
          <span className="text-sm text-slate-500">{hackathons.length} listed</span>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-600">Loading hackathons...</p>
        ) : null}

        {!isLoading && hackathons.length === 0 ? (
          <EmptyState
            title="No hackathons yet"
            subtitle="Admins can add upcoming events from the admin panel."
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {hackathons.map((hackathon) => (
            <article key={hackathon._id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">{hackathon.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{hackathon.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(hackathon.date).toLocaleDateString()}
                </span>
                <a
                  href={hackathon.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-teal-700 hover:underline"
                >
                  Open Event Link
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
