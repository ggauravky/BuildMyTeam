import { useQuery } from "@tanstack/react-query";
import { Mail, Trophy, Users } from "lucide-react";
import { profileApi } from "../api/profile.api";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";

export function ProfilePage() {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.getMine(),
  });

  const profile = profileQuery.data?.profile;

  return (
    <div>
      <PageHeader title="Profile" description="View your identity, teams, and hackathon participation history." />

      {profileQuery.isLoading ? <p className="text-sm text-slate-600">Loading profile...</p> : null}

      {!profileQuery.isLoading && !profile ? (
        <EmptyState title="Profile unavailable" subtitle="Please try again in a few seconds." />
      ) : null}

      {profile ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
                <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </p>
              </div>
              <div className="space-y-2 text-right">
                <StatusBadge value={profile.status} />
                <p className="text-sm font-semibold text-slate-700">Role: {profile.role}</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Users className="h-5 w-5" /> Teams Joined
              </h3>

              {profile.teams.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">You are not part of any team yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {profile.teams.map((team) => (
                    <li key={team._id} className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.projectName}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Trophy className="h-5 w-5" /> Hackathons Participated
              </h3>

              {profile.hackathonsParticipated.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No hackathon participation found yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {profile.hackathonsParticipated.map((hackathon, index) => (
                    <li key={hackathon.id || `${hackathon.link}-${index}`} className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{hackathon.title}</p>
                      <a href={hackathon.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-teal-700 hover:underline">
                        Open Link
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
