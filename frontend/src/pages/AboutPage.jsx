import { AtSign, Globe, Link as LinkIcon, UserCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import myImage from "../assets/myimg.jpg";

const SOCIAL_LINKS = [
  {
    name: "Portfolio",
    href: "https://ggauravky.vercel.app/",
    icon: LinkIcon,
  },
  {
    name: "GitHub",
    href: "https://github.com/ggauravky",
    icon: Globe,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/gauravky/",
    icon: UserCircle2,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/the_gau_rav/",
    icon: AtSign,
  },
];

const WEBSITE_POINTERS = [
  "Find current hackathons and events in one place.",
  "Create teams faster with role-based member matching.",
  "Share project and collaboration links in a clean team workspace.",
  "Track approvals, requests, and updates without confusion.",
];

export function AboutPage() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-700">About BuildMyTeam</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Built to make team formation simple.</h1>
        <p className="mt-4 max-w-3xl text-sm text-slate-600 lg:text-base">
          BuildMyTeam helps students discover opportunities, form balanced teams, and stay organized during fast-paced hackathons and events.
        </p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Creator Intro</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 lg:text-base">
            Hi, I am the creator of BuildMyTeam. I built this website to solve a very common student problem: people have ideas and motivation, but they struggle to quickly find the right teammates for hackathons and project events.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600 lg:text-base">
            My goal is to keep the process clear and practical, so students can spend less time coordinating and more time building.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {SOCIAL_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </a>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-slate-500">Connect with me using the links above.</p>
        </article>

        <aside className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg sm:p-8">
          <div className="mx-auto h-56 w-56 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 sm:h-64 sm:w-64">
            <img src={myImage} alt="Creator" className="h-full w-full object-cover" />
          </div>

          <h3 className="mt-6 text-lg font-bold text-slate-900">What this website does</h3>
          <ul className="mt-4 grid gap-3 text-sm text-slate-600">
            {WEBSITE_POINTERS.map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Back to Home
        </Link>
        <Link
          to="/register"
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Join BuildMyTeam
        </Link>
      </div>
    </div>
  );
}
