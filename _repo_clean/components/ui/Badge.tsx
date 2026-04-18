interface BadgeProps {
  status: string;
}

export function Badge({ status }: BadgeProps) {
  const cls = status === 'Completed' ? 'badge-completed' : status === 'In Progress' ? 'badge-progress' : 'badge-notstarted';
  return <span className={`badge ${cls}`}>{status}</span>;
}