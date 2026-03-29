import { Bell, LogOut, Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { notifications, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.isRead === false).length,
    [notifications]
  );

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Welcome</p>
          <p className="text-sm font-semibold text-slate-900">{user?.name || "User"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className="relative inline-flex rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-teal-700"
                  onClick={() => markAllRead()}
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => markRead(notification._id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        notification.isRead
                          ? "border-slate-200 bg-slate-50 text-slate-600"
                          : "border-teal-100 bg-teal-50 text-slate-800"
                      }`}
                    >
                      <p className="font-medium">{notification.message}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
