import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dff5f2_0%,#f4f7f8_45%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar onMenuClick={() => setMenuOpen((prev) => !prev)} />

          {menuOpen ? (
            <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
              <Sidebar mobile onNavigate={() => setMenuOpen(false)} />
            </div>
          ) : null}

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
