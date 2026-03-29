    export function PageHeader({ title, description, actions = null }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}
