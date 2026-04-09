import { Bell, LogOut, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";

const formatNotificationTime = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString();
};

function NotificationsPanel({
  notifications,
  unreadCount,
  isLoading,
  isError,
  errorMessage,
  isUpdating,
  onMarkRead,
  onMarkAllRead,
  onClose,
  mobile = false,
}) {
  return (
    <div
      className={
        mobile
          ? "fixed inset-x-2 bottom-2 top-16 z-[80] flex flex-col rounded-2xl border-2 border-slate-300 bg-white p-3 opacity-100 shadow-[0_22px_55px_rgba(15,23,42,0.36)]"
          : "absolute right-0 top-[calc(100%+0.5rem)] z-50 flex w-[24rem] max-w-[calc(100vw-2rem)] max-h-[70vh] flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          <p className="text-xs text-slate-500">{unreadCount} unread</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0 || isUpdating}
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1 sm:max-h-[calc(70vh-4.5rem)]">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`notification-skeleton-${index}`}
              className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <div className="h-3 w-11/12 rounded bg-slate-200" />
              <div className="mt-2 h-2.5 w-2/3 rounded bg-slate-200" />
            </div>
          ))
        ) : null}

        {!isLoading && isError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && !isError && notifications.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification._id}
              type="button"
              onClick={() => onMarkRead(notification._id, notification.isRead)}
              disabled={notification.isRead}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                notification.isRead
                  ? "border-slate-200 bg-white text-slate-600"
                  : "border-teal-200 bg-teal-50/70 text-slate-800 hover:border-teal-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="break-words font-medium leading-5">{notification.message}</p>
                {!notification.isRead ? (
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-teal-500" />
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">{formatNotificationTime(notification.createdAt)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const {
    notifications,
    isLoading,
    isError,
    errorMessage,
    markRead,
    markAllRead,
    isUpdating,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.isRead === false).length,
    [notifications]
  );

  const unreadCountLabel = unreadCount > 99 ? "99+" : unreadCount;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const isMobileViewport = globalThis.window.matchMedia("(max-width: 639px)").matches;

    if (isMobileViewport) {
      document.body.style.overflow = "hidden";
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    globalThis.window.addEventListener("keydown", handleEscape);

    return () => {
      globalThis.window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const onCloseNotifications = () => setOpen(false);

  const onMarkRead = async (id, isRead) => {
    if (isRead) {
      return;
    }

    try {
      await markRead(id);
    } catch {
      // Ignore mark-read errors here and preserve panel state.
    }
  };

  const onMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch {
      // Ignore mark-all errors here and preserve panel state.
    }
  };

  const desktopPanel = open ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 hidden sm:block"
        onClick={onCloseNotifications}
        aria-label="Close notifications"
      />

      <NotificationsPanel
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        isUpdating={isUpdating}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        onClose={onCloseNotifications}
      />
    </>
  ) : null;

  const mobilePanel =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[70] bg-slate-950/45 sm:hidden"
              onClick={onCloseNotifications}
              aria-label="Close notifications"
            />

            <div className="sm:hidden">
              <NotificationsPanel
                notifications={notifications}
                unreadCount={unreadCount}
                isLoading={isLoading}
                isError={isError}
                errorMessage={errorMessage}
                isUpdating={isUpdating}
                onMarkRead={onMarkRead}
                onMarkAllRead={onMarkAllRead}
                onClose={onCloseNotifications}
                mobile
              />
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
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
          <p className="max-w-[9rem] truncate text-sm font-semibold text-slate-900 sm:max-w-none">
            {user?.name || "User"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className="relative inline-flex rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Notifications"
            aria-expanded={open}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {unreadCountLabel}
              </span>
            ) : null}
          </button>

          {desktopPanel}
          {mobilePanel}
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
