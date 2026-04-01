import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink } from "lucide-react";
import { hackathonApi } from "../api/hackathon.api";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";

export function HackathonsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["hackathons"],
    queryFn: () => hackathonApi.list(),
  });

  const hackathons = data?.hackathons || [];

  return (
    <div>
      <PageHeader
        title="Hackathons"
        description="Browse all listed hackathons and open event links directly."
      />

      {isLoading ? <p className="text-sm text-slate-600">Loading hackathons...</p> : null}

      {!isLoading && hackathons.length === 0 ? (
        <EmptyState
          title="No hackathons available"
          subtitle="Ask your admin to add upcoming hackathons to start building teams."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {hackathons.map((hackathon) => (
          <article key={hackathon._id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
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
