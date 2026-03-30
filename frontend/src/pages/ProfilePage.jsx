import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  ExternalLink,
  GitFork,
  Globe,
  Mail,
  PencilLine,
  Save,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { profileApi } from "../api/profile.api";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAuth } from "../hooks/useAuth";

const emptySocialLinks = {
  github: "",
  linkedin: "",
  website: "",
};

const buildFormStateFromProfile = (profile) => ({
  name: profile?.name || "",
  username: profile?.username || "",
  headline: profile?.headline || "",
  bio: profile?.bio || "",
  skills: (profile?.skills || []).join(", "),
  socialLinks: {
    github: profile?.socialLinks?.github || "",
    linkedin: profile?.socialLinks?.linkedin || "",
    website: profile?.socialLinks?.website || "",
  },
});

const toProfilePayload = (formState) => {
  const skills = formState.skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return {
    name: formState.name.trim(),
    username: formState.username.trim().toLowerCase(),
    headline: formState.headline.trim(),
    bio: formState.bio.trim(),
    skills,
    socialLinks: {
      github: formState.socialLinks.github.trim(),
      linkedin: formState.socialLinks.linkedin.trim(),
      website: formState.socialLinks.website.trim(),
    },
  };
};

export function ProfilePage() {
  const { username } = useParams();
  const { isAuthenticated, user, refreshCurrentUser } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [formState, setFormState] = useState({
    name: "",
    username: "",
    headline: "",
    bio: "",
    skills: "",
    socialLinks: emptySocialLinks,
  });

  const normalizedUsername = useMemo(() => String(username || "").trim().toLowerCase(), [username]);
  const isPublicRoute = Boolean(normalizedUsername);

  const profileQuery = useQuery({
    queryKey: isPublicRoute ? ["public-profile", normalizedUsername] : ["profile"],
    queryFn: () =>
      isPublicRoute
        ? profileApi.getPublicByUsername(normalizedUsername)
        : profileApi.getMine(),
    enabled: !isPublicRoute || Boolean(normalizedUsername),
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload) => profileApi.updateMine(payload),
    onSuccess: async (data) => {
      setFeedback("Profile updated successfully.");
      setIsEditing(false);

      queryClient.setQueryData(["profile"], data);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      await refreshCurrentUser();
    },
    onError: (error) => {
      setFeedback(error.response?.data?.issues?.[0]?.message || error.response?.data?.message || "Unable to update profile.");
    },
  });

  const profile = profileQuery.data?.profile;
  const canEdit = Boolean(
    isAuthenticated &&
      profile?.username &&
      user?.username &&
      profile.username.toLowerCase() === user.username.toLowerCase()
  );

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const onSocialInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value,
      },
    }));
  };

  const onStartEdit = () => {
    if (!profile) {
      return;
    }

    setFeedback("");
    setFormState(buildFormStateFromProfile(profile));
    setIsEditing(true);
  };

  const onCancelEdit = () => {
    if (profile) {
      setFormState(buildFormStateFromProfile(profile));
    }
    setFeedback("");
    setIsEditing(false);
  };

  const onSubmitEdit = (event) => {
    event.preventDefault();
    setFeedback("");
    updateProfileMutation.mutate(toProfilePayload(formState));
  };

  const publicProfileUrl =
    profile?.username && typeof globalThis.window !== "undefined"
      ? `${globalThis.window.location.origin}/profile/${profile.username}`
      : "";

  return (
    <div>
      <PageHeader
        title={isPublicRoute ? "Public Profile" : "Profile"}
        description={
          isPublicRoute
            ? "Browse this member's profile, team participation, and hackathon activity."
            : "Manage your profile details and share your public profile page."
        }
      />

      {feedback ? (
        <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {feedback}
        </p>
      ) : null}

      {profileQuery.isLoading ? <p className="text-sm text-slate-600">Loading profile...</p> : null}

      {!profileQuery.isLoading && !profile ? (
        <EmptyState
          title="Profile unavailable"
          subtitle={
            isPublicRoute
              ? "This profile does not exist or is temporarily unavailable."
              : "Please try again in a few seconds."
          }
        />
      ) : null}

      {profile ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-700">@{profile.username}</p>
                {profile.email ? (
                  <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </p>
                ) : null}
                {profile.headline ? <p className="mt-2 text-sm text-slate-700">{profile.headline}</p> : null}
              </div>

              <div className="space-y-2 text-right">
                {profile.status ? <StatusBadge value={profile.status} /> : null}
                <p className="text-sm font-semibold text-slate-700">Role: {profile.role}</p>

                {canEdit && !isEditing ? (
                  <button
                    type="button"
                    onClick={onStartEdit}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit Profile
                  </button>
                ) : null}

                {canEdit && isPublicRoute ? (
                  <Link
                    to="/profile"
                    className="block text-xs font-semibold text-teal-700 hover:underline"
                  >
                    Open editable profile view
                  </Link>
                ) : null}
              </div>
            </div>

            {!isEditing && profile.bio ? (
              <p className="mt-4 text-sm leading-6 text-slate-700">{profile.bio}</p>
            ) : null}

            {publicProfileUrl ? (
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
                Public URL:
                <a
                  href={publicProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                >
                  {publicProfileUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {(profile.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>

            {(profile.socialLinks?.github ||
              profile.socialLinks?.linkedin ||
              profile.socialLinks?.website) ? (
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {profile.socialLinks?.github ? (
                  <a
                    href={profile.socialLinks.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                  >
                    <GitFork className="h-4 w-4" /> GitHub
                  </a>
                ) : null}
                {profile.socialLinks?.linkedin ? (
                  <a
                    href={profile.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                  >
                    <Briefcase className="h-4 w-4" /> LinkedIn
                  </a>
                ) : null}
                {profile.socialLinks?.website ? (
                  <a
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                  >
                    <Globe className="h-4 w-4" /> Website
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>

          {canEdit && isEditing ? (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Edit Profile</h3>

              <form onSubmit={onSubmitEdit} className="mt-3 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Name
                    <input
                      name="name"
                      value={formState.name}
                      onChange={onInputChange}
                      required
                      maxLength={80}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Username
                    <input
                      name="username"
                      value={formState.username}
                      onChange={onInputChange}
                      required
                      minLength={3}
                      maxLength={30}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>
                </div>

                <label className="text-sm font-semibold text-slate-700">
                  Headline
                  <input
                    name="headline"
                    value={formState.headline}
                    onChange={onInputChange}
                    maxLength={120}
                    placeholder="Full-stack builder focused on AI and product design"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Bio
                  <textarea
                    name="bio"
                    value={formState.bio}
                    onChange={onInputChange}
                    maxLength={500}
                    rows={4}
                    placeholder="Tell people what you are building and what roles you're looking for."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Skills (comma separated)
                  <input
                    name="skills"
                    value={formState.skills}
                    onChange={onInputChange}
                    maxLength={250}
                    placeholder="React, Node.js, UI Design"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-semibold text-slate-700">
                    GitHub URL
                    <input
                      name="github"
                      type="url"
                      value={formState.socialLinks.github}
                      onChange={onSocialInputChange}
                      placeholder="https://github.com/yourname"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    LinkedIn URL
                    <input
                      name="linkedin"
                      type="url"
                      value={formState.socialLinks.linkedin}
                      onChange={onSocialInputChange}
                      placeholder="https://linkedin.com/in/yourname"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Personal Website
                    <input
                      name="website"
                      type="url"
                      value={formState.socialLinks.website}
                      onChange={onSocialInputChange}
                      placeholder="https://yourwebsite.com"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    <Save className="h-4 w-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Users className="h-5 w-5" /> Teams Joined
              </h3>

              {profile.teams.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No team memberships yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {profile.teams.map((team) => (
                    <li key={team._id || team.id} className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.projectName || "No project title"}</p>
                      <p className="text-xs text-slate-500">
                        Members: {team.members?.length ?? team.memberCount ?? 0}
                        {team.maxSize ? `/${team.maxSize}` : ""}
                      </p>
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
                    <li
                      key={hackathon.id || `${hackathon.link}-${index}`}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-slate-900">{hackathon.title}</p>
                      <a
                        href={hackathon.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-teal-700 hover:underline"
                      >
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
