import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink } from "lucide-react";
import { eventApi } from "../api/event.api";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";

export function EventsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => eventApi.list(),
  });

  const events = data?.events || [];

  return (
    <div>
      <PageHeader
        title="Events"
        description="Browse upcoming events and build teams around each event."
      />

      {isLoading ? <p className="text-sm text-slate-600">Loading events...</p> : null}

      {!isLoading && events.length === 0 ? (
        <EmptyState
          title="No events available"
          subtitle="Ask your admin to add upcoming events to start planning teams."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <article key={event._id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
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
                Visit Event
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
