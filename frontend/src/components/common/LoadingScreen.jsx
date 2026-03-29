export function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 text-center shadow-lg backdrop-blur">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        <p className="text-sm font-medium tracking-wide text-slate-600">{message}</p>
      </div>
    </div>
  );
}
