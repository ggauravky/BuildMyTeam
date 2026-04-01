import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { eventApi } from "../api/event.api";
import { hackathonApi } from "../api/hackathon.api";
import { EmptyState } from "../components/common/EmptyState";
import { useAuth } from "../hooks/useAuth";

export function HomePage() {
  const { isAuthenticated, isApproved } = useAuth();
  const hackathonsQuery = useQuery({
    queryKey: ["hackathons-home"],
    queryFn: () => hackathonApi.list(),
  });
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: () => eventApi.list(),
  });

  const hackathons = hackathonsQuery.data?.hackathons || [];
  const events = eventsQuery.data?.events || [];

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-700">BuildMyTeam</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Build stronger hackathon teams.</h1>
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

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Upcoming Hackathons</h2>
            <span className="text-sm text-slate-500">{hackathons.length} listed</span>
          </div>

          {hackathonsQuery.isLoading ? (
            <p className="text-sm text-slate-600">Loading hackathons...</p>
          ) : null}

          {!hackathonsQuery.isLoading && hackathons.length === 0 ? (
            <EmptyState
              title="No hackathons yet"
              subtitle="Admins can add upcoming hackathons from the admin panel."
            />
          ) : null}

          <div className="grid gap-4">
            {hackathons.map((hackathon) => (
              <div key={hackathon._id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{hackathon.title}</h3>
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
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Upcoming Events</h2>
            <span className="text-sm text-slate-500">{events.length} listed</span>
          </div>

          {eventsQuery.isLoading ? <p className="text-sm text-slate-600">Loading events...</p> : null}

          {!eventsQuery.isLoading && events.length === 0 ? (
            <EmptyState
              title="No events yet"
              subtitle="Admins can add upcoming events from the admin panel."
            />
          ) : null}

          <div className="grid gap-4">
            {events.map((event) => (
              <div key={event._id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{event.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{event.description}</p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-semibold text-teal-700 hover:underline"
                  >
                    Open Event Link
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
