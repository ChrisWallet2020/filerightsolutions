export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill_${status}`}>{status}</span>;
}