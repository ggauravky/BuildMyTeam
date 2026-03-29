export function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 p-8 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}
