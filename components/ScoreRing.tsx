export default function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const color = score >= 63 ? "#10B981" : score >= 45 ? "#F59E0B" : "#F43F5E";
  return (
    <div className="flex flex-col items-center">
      <svg width="116" height="116" viewBox="0 0 116 116" role="img" aria-label={`${label}: ${score} out of 100`}>
        <circle cx="58" cy="58" r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="9" />
        <circle
          cx="58" cy="58" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`} transform="rotate(-90 58 58)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x="58" y="55" textAnchor="middle" fill="#E6EAF2" fontSize="24" fontFamily="ui-monospace, monospace" fontWeight="700">
          {score}
        </text>
        <text x="58" y="73" textAnchor="middle" fill="#8B95A7" fontSize="10" fontFamily="ui-monospace, monospace">
          / 100
        </text>
      </svg>
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted font-mono mt-1">{label}</span>
    </div>
  );
}
