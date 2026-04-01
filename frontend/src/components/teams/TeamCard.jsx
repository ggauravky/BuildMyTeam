import { ExternalLink, Users } from "lucide-react";
import { Link } from "react-router-dom";

export function TeamCard({ team }) {
  const isEventTeam = team.trackType === "event";
  const contextLabel = isEventTeam ? "Event" : "Hackathon";
  const contextLink = isEventTeam ? team.eventLink : team.hackathonLink;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{team.name}</h3>
          <p className="text-sm text-slate-500">{team.projectName}</p>
        </div>
        <span className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
          #{team.joinCode}
        </span>
      </div>

      <div className="space-y-1 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {team.members.length}/{team.maxSize} members
        </p>
        {contextLink ? (
          <a
            href={contextLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-teal-700 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {contextLabel} Link
          </a>
        ) : null}
      </div>

      <div className="mt-4">
        <Link
          to={`/teams/${team._id}`}
          className="inline-flex w-full justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
        >
          Open Team Workspace
        </Link>
      </div>
    </article>
  );
}
