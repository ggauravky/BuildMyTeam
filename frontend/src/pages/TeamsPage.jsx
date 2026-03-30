import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { hackathonApi } from "../api/hackathon.api";
import { joinRequestApi } from "../api/joinRequest.api";
import { teamApi } from "../api/team.api";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { TeamCard } from "../components/teams/TeamCard";
import { QRCodeScanner } from "../components/teams/QRCodeScanner";

const JOIN_CODE_PATTERN = /^(\d{4,5}|[A-Z0-9]{10})$/;
const normalizeJoinCodeInput = (value = "") => value.toUpperCase().replaceAll(/\s+/g, "").trim();

export function TeamsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [hackathonFilter, setHackathonFilter] = useState(searchParams.get("hackathon") || "");
  const [joinCode, setJoinCode] = useState(normalizeJoinCodeInput(searchParams.get("code") || ""));
  const [feedback, setFeedback] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const nextParams = {};
    if (search) nextParams.search = search;
    if (hackathonFilter) nextParams.hackathon = hackathonFilter;
    if (joinCode) nextParams.code = joinCode;
    setSearchParams(nextParams, { replace: true });
  }, [search, hackathonFilter, joinCode, setSearchParams]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [search]);

  const teamsQuery = useQuery({
    queryKey: ["teams", debouncedSearch, hackathonFilter],
    queryFn: () => teamApi.list({ search: debouncedSearch, hackathon: hackathonFilter }),
  });

  const hackathonsQuery = useQuery({
    queryKey: ["hackathons-filter-options"],
    queryFn: () => hackathonApi.list(),
  });

  const joinMutation = useMutation({
    mutationFn: (code) => joinRequestApi.createByCode(code),
    onSuccess: () => {
      setFeedback("Join request submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ["my-join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      setFeedback(error.response?.data?.message || "Could not submit join request.");
    },
  });

  const teams = teamsQuery.data?.teams || [];
  const hackathons = hackathonsQuery.data?.hackathons || [];

  const onJoinSubmit = (event) => {
    event.preventDefault();
    setFeedback("");

    if (!JOIN_CODE_PATTERN.test(joinCode)) {
      setFeedback("Please enter a valid join code.");
      return;
    }

    joinMutation.mutate(joinCode);
  };

  const selectedHackathon = hackathons.find((item) => item._id === hackathonFilter);
  const selectedHackathonTitle = selectedHackathon?.title || "";

  return (
    <div>
      <PageHeader
        title="Teams"
        description="Search teams, filter by hackathon, and request access using team join code or QR."
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Search by team name
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. Nexus Builders"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 transition focus:ring"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Filter by hackathon
              <select
                value={hackathonFilter}
                onChange={(event) => setHackathonFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 transition focus:ring"
              >
                <option value="">All hackathons</option>
                {hackathons.map((hackathon) => (
                  <option key={hackathon._id} value={hackathon._id}>
                    {hackathon.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedHackathonTitle ? (
            <p className="mt-3 text-xs text-slate-500">Showing teams for {selectedHackathonTitle}</p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <form onSubmit={onJoinSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              Join Team by Code
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(normalizeJoinCodeInput(event.target.value))}
                maxLength={10}
                placeholder="Enter code"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 transition focus:ring"
              />
            </label>
            <button
              type="submit"
              className="mt-3 w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {joinMutation.isPending ? "Submitting..." : "Request to Join"}
            </button>
          </form>

          <QRCodeScanner onCodeDetected={(value) => setJoinCode(normalizeJoinCodeInput(value))} />

          {feedback ? <p className="text-sm text-slate-700">{feedback}</p> : null}
        </div>
      </section>

      {teamsQuery.isLoading ? <p className="text-sm text-slate-600">Loading teams...</p> : null}

      {!teamsQuery.isLoading && teams.length === 0 ? (
        <EmptyState
          title="No teams found"
          subtitle="Try adjusting filters or create a new team from the sidebar."
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <TeamCard key={team._id} team={team} />
        ))}
      </section>
    </div>
  );
}
