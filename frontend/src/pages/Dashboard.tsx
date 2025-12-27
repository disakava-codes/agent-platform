import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken } from "../api/client";

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const [question, setQuestion] = useState("Θέλω ενημέρωση απουσιών");
  const [studentId, setStudentId] = useState("STU-002");
  const [decision, setDecision] = useState<any>(null);

  async function loadMe() {
    setError("");
    try {
      const data = await apiFetch("/api/auth/me", { auth: true });
      setMe(data);
    } catch (err: any) {
      setError(err.message || "Failed to load /me");
      setMe(null);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDecision(null);

    if (!me?.tenant_id) {
      setError("No tenant_id. Login first.");
      return;
    }

    try {
      const payload: any = { question };
      if (studentId.trim()) payload.fields = { student_id: studentId.trim() };

      const data = await apiFetch(`/api/tenants/${me.tenant_id}/decision`, {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload),
      });

      setDecision(data);
    } catch (err: any) {
      setError(err.message || "Decision failed");
    }
  }

  function onLogout() {
    clearToken();
    setMe(null);
    setDecision(null);
    setError("Logged out. Go to Login.");
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", fontFamily: "sans-serif" }}>
      <h2>Dashboard</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={loadMe}>Refresh /me</button>
        <button onClick={onLogout}>Logout</button>
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          token: {getToken() ? "✅ stored" : "❌ none"}
        </span>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {me && (
        <>
          <h3>/auth/me</h3>
          <pre style={{ background: "#111", color: "#0f0", padding: 12, overflow: "auto" }}>
            {JSON.stringify(me, null, 2)}
          </pre>
        </>
      )}

      <h3>Decision</h3>
      <form onSubmit={onAsk} style={{ display: "grid", gap: 12 }}>
        <label>
          Question
          <input value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>

        <label>
          student_id (optional)
          <input value={studentId} onChange={(e) => setStudentId(e.target.value)} />
        </label>

        <button type="submit">Ask</button>
      </form>

      {decision && (
        <>
          <h3>Decision result</h3>
          <pre style={{ background: "#111", color: "#0f0", padding: 12, overflow: "auto" }}>
            {JSON.stringify(decision, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
