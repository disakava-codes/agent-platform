import Badge from "./Badge";
import ConfidenceBar from "./ConfidenceBar";

type Decision = {
  decision: "ANSWER" | "ESCALATE" | "DENY";
  explanation: string;
  confidence: number;
  next_steps?: string[];
  org_type?: string;
};

function tone(decision: Decision["decision"]) {
  if (decision === "ANSWER") return "green";
  if (decision === "ESCALATE") return "orange";
  return "red";
}

export default function DecisionCard({ d }: { d: Decision }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "white" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge label={d.decision} tone={tone(d.decision) as any} />
          {d.org_type && <Badge label={d.org_type} />}
        </div>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Latest decision</span>
      </div>

      <p style={{ marginTop: 12, marginBottom: 8, fontSize: 14, color: "#111827" }}>
        <b>Reason:</b> {d.explanation}
      </p>

      {d.next_steps?.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {d.next_steps.map((s) => (
            <Badge key={s} label={s} />
          ))}
        </div>
      ) : null}

      <ConfidenceBar value={d.confidence} />
    </div>
  );
}

