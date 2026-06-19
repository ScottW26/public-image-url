const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Longlist", color: "bg-gray-300" },
  1: { label: "Longlist", color: "bg-gray-300" },
  2: { label: "Presented", color: "bg-blue-400" },
  3: { label: "Interviewing", color: "bg-yellow-400" },
  4: { label: "Late Stage / Offer", color: "bg-green-500" },
};

export function FeeProximityBar({ score }: { score: number }) {
  const info = PHASE_LABELS[score] ?? PHASE_LABELS[0];
  const width = `${(score / 4) * 100}%`;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${info.color}`} style={{ width }} />
      </div>
      <span className="text-xs text-gray-500">{info.label}</span>
    </div>
  );
}
