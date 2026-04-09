import { Bell, Clock3, Filter, LogOut, Menu, Settings2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", accentClass: "bg-rose-500" },
  { value: "high", label: "High", accentClass: "bg-orange-500" },
  { value: "medium", label: "Medium", accentClass: "bg-sky-500" },
  { value: "low", label: "Low", accentClass: "bg-slate-500" },
];

const DEFAULT_PREFERENCES_DRAFT = {
  inAppEnabled: true,
  enabledPriorities: ["low", "medium", "high", "critical"],
  mutedTypes: [],
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
    timezone: "UTC",
  },
};

const buildPreferencesDraft = (preferences) => ({
  inAppEnabled: preferences?.inAppEnabled ?? true,
  enabledPriorities: preferences?.enabledPriorities || ["low", "medium", "high", "critical"],
  mutedTypes: preferences?.mutedTypes || [],
  quietHours: {
    enabled: preferences?.quietHours?.enabled ?? false,
    start: preferences?.quietHours?.start || "22:00",
    end: preferences?.quietHours?.end || "08:00",
    timezone: preferences?.quietHours?.timezone || "UTC",
  },
});

const getPriorityBadgeClass = (priority) => {
  if (priority === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (priority === "high") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (priority === "low") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
};

const formatNotificationTime = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString();
};

function NotificationsPanel({
  notifications,
  summary,
  unreadCount,
  isLoading,
  isError,
  errorMessage,
  isUpdating,
  priorityFilters,
  onTogglePriorityFilter,
  onClearPriorityFilters,
  showPreferences,
  onTogglePreferences,
  preferencesDraft,
  onPreferenceDraftChange,
  onSavePreferences,
  isPreferencesLoading,
  preferencesError,
  isUpdatingPreferences,
  preferencesFeedback,
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
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            onClick={onTogglePreferences}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Preferences
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

      <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
        <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
          <Filter className="h-3.5 w-3.5" />
          Priority Filters
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onClearPriorityFilters}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              priorityFilters.length === 0
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            All ({notifications.length})
          </button>
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onTogglePriorityFilter(option.value)}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                priorityFilters.includes(option.value)
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {option.label} ({summary.countsByPriority?.[option.value] || 0})
            </button>
          ))}
        </div>
      </div>

      {showPreferences ? (
        <section className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <h4 className="text-xs font-semibold text-slate-800">Notification Preferences</h4>

          {isPreferencesLoading ? (
            <p className="mt-2 text-xs text-slate-500">Loading preferences...</p>
          ) : (
            <>
              <label className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700">
                <span>Enable in-app notifications</span>
                <input
                  type="checkbox"
                  checked={Boolean(preferencesDraft.inAppEnabled)}
                  onChange={(event) =>
                    onPreferenceDraftChange("inAppEnabled", event.target.checked)
                  }
                />
              </label>

              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-xs font-semibold text-slate-700">Enabled Priorities</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map((option) => {
                    const enabled = preferencesDraft.enabledPriorities.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          const nextSet = new Set(preferencesDraft.enabledPriorities);

                          if (nextSet.has(option.value)) {
                            nextSet.delete(option.value);
                          } else {
                            nextSet.add(option.value);
                          }

                          onPreferenceDraftChange("enabledPriorities", Array.from(nextSet));
                        }}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          enabled
                            ? "border-slate-800 bg-slate-800 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Clock3 className="h-3.5 w-3.5" />
                    Quiet Hours
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferencesDraft.quietHours.enabled)}
                    onChange={(event) =>
                      onPreferenceDraftChange("quietHours.enabled", event.target.checked)
                    }
                  />
                </label>

                {preferencesDraft.quietHours.enabled ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Start
                      <input
                        type="time"
                        value={preferencesDraft.quietHours.start}
                        onChange={(event) =>
                          onPreferenceDraftChange("quietHours.start", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      End
                      <input
                        type="time"
                        value={preferencesDraft.quietHours.end}
                        onChange={(event) =>
                          onPreferenceDraftChange("quietHours.end", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              {preferencesError ? (
                <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  {preferencesError}
                </p>
              ) : null}

              {preferencesFeedback ? (
                <p className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                  {preferencesFeedback}
                </p>
              ) : null}

              <button
                type="button"
                onClick={onSavePreferences}
                className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                disabled={isUpdatingPreferences}
              >
                {isUpdatingPreferences ? "Saving preferences..." : "Save Preferences"}
              </button>
            </>
          )}
        </section>
      ) : null}

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
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${getPriorityBadgeClass(
                    notification.priority || "medium"
                  )}`}
                >
                  {notification.priority || "medium"}
                </span>
                <p className="text-xs text-slate-500">{formatNotificationTime(notification.createdAt)}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [priorityFilters, setPriorityFilters] = useState([]);
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferencesDraft, setPreferencesDraft] = useState(DEFAULT_PREFERENCES_DRAFT);
  const [preferencesFeedback, setPreferencesFeedback] = useState("");

  const {
    notifications: filteredNotifications,
    summary: filteredSummary,
    isLoading: isFilteredLoading,
    isError: isFilteredError,
    errorMessage: filteredErrorMessage,
    markRead: markFilteredRead,
    markAllRead: markAllFilteredRead,
    isUpdating: isFilteredUpdating,
    preferences,
    isPreferencesLoading,
    preferencesError,
    updatePreferences,
    isUpdatingPreferences,
  } = useNotifications({ priorities: priorityFilters });

  const unreadCount = useMemo(
    () =>
      typeof filteredSummary?.unreadCount === "number"
        ? filteredSummary.unreadCount
        : filteredNotifications.filter((item) => item.isRead === false).length,
    [filteredNotifications, filteredSummary]
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

  const onTogglePreferences = () => {
    setShowPreferences((previous) => {
      const nextValue = !previous;

      if (nextValue) {
        setPreferencesDraft(buildPreferencesDraft(preferences));
        setPreferencesFeedback("");
      }

      return nextValue;
    });
  };

  const onTogglePriorityFilter = (priority) => {
    setPriorityFilters((previous) => {
      if (previous.includes(priority)) {
        return previous.filter((value) => value !== priority);
      }

      return [...previous, priority];
    });
  };

  const onClearPriorityFilters = () => {
    setPriorityFilters([]);
  };

  const onPreferenceDraftChange = (path, value) => {
    setPreferencesFeedback("");

    if (!path.includes(".")) {
      setPreferencesDraft((previous) => ({ ...previous, [path]: value }));
      return;
    }

    const [root, key] = path.split(".");
    setPreferencesDraft((previous) => ({
      ...previous,
      [root]: {
        ...previous[root],
        [key]: value,
      },
    }));
  };

  const onSavePreferences = async () => {
    const enabledPriorities = Array.from(
      new Set(
        (preferencesDraft.enabledPriorities || [])
          .map((entry) => String(entry || "").trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (enabledPriorities.length === 0) {
      setPreferencesFeedback("Enable at least one priority to receive notifications.");
      return;
    }

    try {
      await updatePreferences({
        inAppEnabled: Boolean(preferencesDraft.inAppEnabled),
        enabledPriorities,
        quietHours: {
          enabled: Boolean(preferencesDraft.quietHours.enabled),
          start: preferencesDraft.quietHours.start,
          end: preferencesDraft.quietHours.end,
          timezone: preferencesDraft.quietHours.timezone,
        },
      });
      setPreferencesFeedback("Preferences saved.");
    } catch (error) {
      setPreferencesFeedback(
        error.response?.data?.message || "Unable to update preferences right now."
      );
    }
  };

  const onMarkRead = async (id, isRead) => {
    if (isRead) {
      return;
    }

    try {
      await markFilteredRead(id);
    } catch {
      // Ignore mark-read errors here and preserve panel state.
    }
  };

  const onMarkAllRead = async () => {
    try {
      await markAllFilteredRead();
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
        notifications={filteredNotifications}
        summary={filteredSummary}
        unreadCount={unreadCount}
        isLoading={isFilteredLoading}
        isError={isFilteredError}
        errorMessage={filteredErrorMessage}
        isUpdating={isFilteredUpdating}
        priorityFilters={priorityFilters}
        onTogglePriorityFilter={onTogglePriorityFilter}
        onClearPriorityFilters={onClearPriorityFilters}
        showPreferences={showPreferences}
        onTogglePreferences={onTogglePreferences}
        preferencesDraft={preferencesDraft}
        onPreferenceDraftChange={onPreferenceDraftChange}
        onSavePreferences={onSavePreferences}
        isPreferencesLoading={isPreferencesLoading}
        preferencesError={preferencesError}
        isUpdatingPreferences={isUpdatingPreferences}
        preferencesFeedback={preferencesFeedback}
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
                notifications={filteredNotifications}
                summary={filteredSummary}
                unreadCount={unreadCount}
                isLoading={isFilteredLoading}
                isError={isFilteredError}
                errorMessage={filteredErrorMessage}
                isUpdating={isFilteredUpdating}
                priorityFilters={priorityFilters}
                onTogglePriorityFilter={onTogglePriorityFilter}
                onClearPriorityFilters={onClearPriorityFilters}
                showPreferences={showPreferences}
                onTogglePreferences={onTogglePreferences}
                preferencesDraft={preferencesDraft}
                onPreferenceDraftChange={onPreferenceDraftChange}
                onSavePreferences={onSavePreferences}
                isPreferencesLoading={isPreferencesLoading}
                preferencesError={preferencesError}
                isUpdatingPreferences={isUpdatingPreferences}
                preferencesFeedback={preferencesFeedback}
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
