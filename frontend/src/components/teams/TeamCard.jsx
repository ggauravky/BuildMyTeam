import { ExternalLink, Users } from "lucide-react";
import { Link } from "react-router-dom";

export function TeamCard({ team }) {
  const isEventTeam = team.trackType === "event";
  const contextLabel = isEventTeam ? "Event" : "Hackathon";
  const contextLink = isEventTeam ? team.eventLink : team.hackathonLink;
  const discoveryMeta = team.discoveryMeta || {};
  const score = typeof discoveryMeta.score === "number" ? discoveryMeta.score : null;
  const hints = discoveryMeta.compatibilityHints || [];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{team.name}</h3>
          <p className="text-sm text-slate-500">{team.projectName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
            #{team.joinCode}
          </span>
          {discoveryMeta.rank ? (
            <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Rank #{discoveryMeta.rank}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-1 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {team.members.length}/{team.maxSize} members
        </p>
        {score !== null ? (
          <div>
            <p className="text-xs font-semibold text-slate-600">Compatibility Score: {score}/100</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>
        ) : null}
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

      {hints.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hints.slice(0, 3).map((hint, index) => (
            <span
              key={`${hint}-${index}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
            >
              {hint}
            </span>
          ))}
        </div>
      ) : null}

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
