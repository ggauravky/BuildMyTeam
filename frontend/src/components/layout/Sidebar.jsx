import { LayoutDashboard, ShieldCheck, Trophy, Users, UserCircle2, UserPlus2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const baseLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hackathons", label: "Hackathons", icon: Trophy },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/teams/create", label: "Create Team", icon: UserPlus2 },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
];

export function Sidebar({ mobile = false, onNavigate = () => {} }) {
  const { isAdmin } = useAuth();

  const links = isAdmin
    ? [...baseLinks, { to: "/admin", label: "Admin Panel", icon: ShieldCheck }]
    : baseLinks;

  return (
    <aside
      className={`${
        mobile
          ? "w-full rounded-2xl border border-slate-200 bg-white/95 p-4"
          : "hidden w-72 border-r border-slate-200 bg-white/90 p-6 backdrop-blur lg:block"
      }`}
    >
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">BuildMyTeam</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">College Collaboration Hub</h2>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
