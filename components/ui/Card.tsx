export function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card">
      <div className="cardTitle">{title}</div>
      <div className="muted">{desc}</div>
    </div>
  );
}