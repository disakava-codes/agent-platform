export default function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
        <span>Confidence</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#111827" }} />
      </div>
    </div>
  );
}

