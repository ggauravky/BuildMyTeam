import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { eventApi } from "../api/event.api";
import { hackathonApi } from "../api/hackathon.api";
import { teamApi } from "../api/team.api";
import { PageHeader } from "../components/common/PageHeader";

const initialForm = {
  targetType: "hackathon",
  name: "",
  hackathonId: "",
  eventId: "",
  hackathonLink: "",
  eventLink: "",
  projectName: "",
  githubLink: "",
  excalidrawLink: "",
  whatsappLink: "",
  maxSize: 4,
};

export function CreateTeamPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  const hackathonsQuery = useQuery({
    queryKey: ["hackathons-create-team"],
    queryFn: () => hackathonApi.list(),
  });

  const eventsQuery = useQuery({
    queryKey: ["events-create-team"],
    queryFn: () => eventApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => teamApi.create(payload),
    onSuccess: (response) => {
      navigate(`/teams/${response.team._id}`);
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || "Could not create team.");
    },
  });

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onTargetTypeChange = (event) => {
    const nextType = event.target.value;

    setForm((prev) => ({
      ...prev,
      targetType: nextType,
      hackathonId: nextType === "hackathon" ? prev.hackathonId : "",
      eventId: nextType === "event" ? prev.eventId : "",
    }));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    setMessage("");

    const payload = {
      ...form,
      maxSize: Number(form.maxSize),
    };

    if (payload.targetType === "hackathon") {
      if (!payload.hackathonId) {
        delete payload.hackathonId;
      }
      delete payload.eventId;
      delete payload.eventLink;
    } else {
      if (!payload.eventId) {
        delete payload.eventId;
      }
      delete payload.hackathonId;
      delete payload.hackathonLink;
    }

    createMutation.mutate(payload);
  };

  const hackathons = hackathonsQuery.data?.hackathons || [];
  const events = eventsQuery.data?.events || [];
  const isHackathonTeam = form.targetType === "hackathon";

  return (
    <div>
      <PageHeader
        title="Create Team"
        description="Create a project team and share collaboration links with members."
      />

      <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Team For
            <select
              name="targetType"
              value={form.targetType}
              onChange={onTargetTypeChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
            >
              <option value="hackathon">Hackathon</option>
              <option value="event">Event</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Team Name
            <input
              required
              name="name"
              value={form.name}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Project Name
            <input
              required
              name="projectName"
              value={form.projectName}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            {isHackathonTeam ? "Linked Hackathon (optional)" : "Linked Event (optional)"}
            {isHackathonTeam ? (
              <select
                name="hackathonId"
                value={form.hackathonId}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
              >
                <option value="">No linked hackathon</option>
                {hackathons.map((hackathon) => (
                  <option key={hackathon._id} value={hackathon._id}>
                    {hackathon.title}
                  </option>
                ))}
              </select>
            ) : (
              <select
                name="eventId"
                value={form.eventId}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
              >
                <option value="">No linked event</option>
                {events.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="text-sm font-semibold text-slate-700">
            {isHackathonTeam ? "Hackathon Link" : "Event Link"}
            <input
              required={isHackathonTeam ? !form.hackathonId : !form.eventId}
              type="url"
              name={isHackathonTeam ? "hackathonLink" : "eventLink"}
              value={isHackathonTeam ? form.hackathonLink : form.eventLink}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            GitHub Link
            <input
              required
              type="url"
              name="githubLink"
              value={form.githubLink}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Excalidraw Link
            <input
              required
              type="url"
              name="excalidrawLink"
              value={form.excalidrawLink}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            WhatsApp Group Link
            <input
              required
              type="url"
              name="whatsappLink"
              value={form.whatsappLink}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Maximum Team Size
            <input
              required
              type="number"
              min={2}
              max={20}
              name="maxSize"
              value={form.maxSize}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring"
            />
          </label>
        </div>

        {message ? <p className="text-sm text-rose-700">{message}</p> : null}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300 sm:w-auto"
        >
          {createMutation.isPending ? "Creating..." : "Create Team"}
        </button>
      </form>
    </div>
  );
}
