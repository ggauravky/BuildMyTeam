const statusStyles = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
  admin: "bg-blue-100 text-blue-700",
};

export function StatusBadge({ value }) {
  const label = String(value || "unknown");

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        statusStyles[label] || "bg-slate-100 text-slate-700"
      }`}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}
