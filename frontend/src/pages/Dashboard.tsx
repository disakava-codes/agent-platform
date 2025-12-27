import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearToken, getToken } from "../api/client";

type Theme = "dark" | "light";

type Me = {
  user_id: string;
  email: string;
  tenant_id: string;
  org_type: string;
};

type DecisionResponse = {
  decision: string;
  rule_id: string | null;
  confidence: number;
  answer: string;
  actions: string[];
  data?: any;
  action_results?: Array<{ name: string; ok: boolean; data?: any; error?: string }>;
  tenant_id: string;
  org_type: string;
  requested_by: string;
};

type Preset = {
  id: string;
  label: string;
  question: string;
  fields?: Record<string, any>;
};

const PRESETS: Preset[] = [
  {
    id: "ABSENCES_INFO",
    label: "Απουσίες μαθητή",
    question: "Θέλω ενημέρωση απουσιών",
    fields: { student_id: "STU-002" },
  },
  {
    id: "ISSUE_CERTIFICATE",
    label: "Βεβαίωση φοίτησης",
    question: "Φοιτητής ζητά βεβαίωση φοίτησης",
    fields: { student_id: "STU-001" },
  },
  {
    id: "CHANGE_CLASS",
    label: "Αλλαγή τμήματος",
    question: "Ποια είναι η διαδικασία για αλλαγή τμήματος;",
    fields: { student_id: "STU-001" },
  },
  {
    id: "FINANCIAL_CLEARANCE",
    label: "Οικονομική ενημερότητα",
    question: "Θέλω ενημέρωση για οικονομική ενημερότητα",
    fields: { student_id: "STU-002" },
  },
  {
    id: "DAILY_REPORT",
    label: "Ημερήσιο report (τομεάρχης)",
    question: "Θέλω να υποβάλω ημερήσιο report",
    fields: { date: new Date().toISOString().slice(0, 10) },
  },
];

function readTheme(): Theme {
  const v = localStorage.getItem("ap_theme");
  return v === "light" ? "light" : "dark";
}

function writeTheme(t: Theme) {
  localStorage.setItem("ap_theme", t);
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Dashboard() {
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [question, setQuestion] = useState(PRESETS[0].question);
  const [fieldsJson, setFieldsJson] = useState<string>(JSON.stringify(PRESETS[0].fields ?? {}, null, 2));
  const [decision, setDecision] = useState<DecisionResponse | null>(null);

  const vars = useMemo(() => {
    if (theme === "light") {
      return {
        bg: "#f6f7fb",
        bg2: "#eef1f8",
        card: "#ffffff",
        card2: "#f8fafc",
        text: "#0f172a",
        mut: "rgba(15,23,42,0.72)",
        border: "rgba(15,23,42,0.12)",
        shadow: "0 10px 40px rgba(2, 6, 23, 0.10)",
        accent: "#2563eb",
        good: "#16a34a",
        bad: "#dc2626",
        monoBg: "#0b1220",
        monoText: "#c7f9cc",
      };
    }
    return {
      bg: "#070b14",
      bg2: "#0b1220",
      card: "#0f1a2e",
      card2: "#0b1426",
      text: "#eaf0ff",
      mut: "rgba(234,240,255,0.72)",
      border: "rgba(234,240,255,0.12)",
      shadow: "0 16px 60px rgba(0,0,0,0.55)",
      accent: "#60a5fa",
      good: "#22c55e",
      bad: "#ef4444",
      monoBg: "#07101f",
      monoText: "#b6f7c1",
    };
  }, [theme]);

  async function loadMe() {
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch("/api/auth/me", { auth: true });
      setMe(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load /me");
      setMe(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    writeTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
    setPresetId(p.id);
    setQuestion(p.question);
    setFieldsJson(JSON.stringify(p.fields ?? {}, null, 2));
  }

  function safeParseFields(): { ok: boolean; value: any; err?: string } {
    const raw = (fieldsJson || "").trim();
    if (!raw) return { ok: true, value: {} };
    try {
      const v = JSON.parse(raw);
      if (v && typeof v === "object") return { ok: true, value: v };
      return { ok: false, value: {}, err: "Fields JSON must be an object." };
    } catch (e: any) {
      return { ok: false, value: {}, err: e?.message || "Invalid JSON in fields." };
    }
  }

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDecision(null);

    if (!me?.tenant_id) {
      setError("No tenant_id. Login first.");
      return;
    }

    const parsed = safeParseFields();
    if (!parsed.ok) {
      setError(`Fields JSON error: ${parsed.err}`);
      return;
    }

    setBusy(true);
    try {
      const payload: any = { question: question.trim() };
      if (Object.keys(parsed.value || {}).length > 0) payload.fields = parsed.value;

      const data = await apiFetch(`/api/tenants/${me.tenant_id}/decision`, {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload),
      });

      setDecision(data);
    } catch (err: any) {
      setError(err?.message || "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  function onLogout() {
    clearToken();
    setMe(null);
    setDecision(null);
    setError("Logged out. Go to Login.");
  }

  const payloadPreview = useMemo(() => {
    const parsed = safeParseFields();
    const p: any = { question: question.trim() };
    if (parsed.ok && parsed.value && Object.keys(parsed.value).length > 0) p.fields = parsed.value;
    return JSON.stringify(p, null, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, fieldsJson]);

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: `radial-gradient(1200px 600px at 15% 10%, ${vars.bg2} 0%, ${vars.bg} 55%, ${vars.bg} 100%)`,
      color: vars.text,
      padding: "28px 18px 60px",
      fontFamily: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`,
    },
    shell: { maxWidth: 1220, margin: "0 auto" },
    topbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 18,
    },
    titleWrap: { display: "flex", flexDirection: "column", gap: 6 },
    h1: { fontSize: 28, margin: 0, letterSpacing: 0.2 },
    sub: { margin: 0, fontSize: 12, color: vars.mut },
    pills: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
    btn: {
      background: vars.card2,
      border: `1px solid ${vars.border}`,
      color: vars.text,
      padding: "10px 12px",
      borderRadius: 12,
      cursor: "pointer",
      boxShadow: "none",
    },
    btnPrimary: {
      background: vars.accent,
      border: `1px solid ${vars.accent}`,
      color: theme === "light" ? "#fff" : "#051224",
      padding: "10px 12px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 700,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "minmax(520px, 1.15fr) minmax(560px, 1.45fr)",
      gap: 16,
      alignItems: "start",
    },
    card: {
      background: `linear-gradient(180deg, ${vars.card} 0%, ${vars.card2} 100%)`,
      border: `1px solid ${vars.border}`,
      borderRadius: 18,
      padding: 16,
      boxShadow: vars.shadow,
    },
    cardTitle: { margin: 0, fontSize: 14, letterSpacing: 0.25, opacity: 0.95 },
    cardSub: { margin: "8px 0 0", fontSize: 12, color: vars.mut },
    kv: {
      display: "grid",
      gridTemplateColumns: "130px 1fr",
      gap: 8,
      marginTop: 12,
      fontSize: 13,
    },
    label: { color: vars.mut },
    value: { fontWeight: 700 },
    form: { display: "grid", gap: 12, marginTop: 12 },
    field: { display: "grid", gap: 6 },
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border: `1px solid ${vars.border}`,
      background: vars.card2,
      color: vars.text,
      outline: "none",
      fontSize: 14,
    },
    textarea: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border: `1px solid ${vars.border}`,
      background: vars.card2,
      color: vars.text,
      outline: "none",
      fontSize: 13,
      minHeight: 140,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
    row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
    hint: { fontSize: 12, color: vars.mut, margin: 0 },
    mono: {
      background: vars.monoBg,
      color: vars.monoText,
      border: `1px solid ${vars.border}`,
      borderRadius: 14,
      padding: 12,
      overflow: "auto",
      fontSize: 12,
      lineHeight: 1.4,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
    footerCard: {
      marginTop: 16,
      background: `linear-gradient(180deg, ${vars.card} 0%, ${vars.card2} 100%)`,
      border: `1px solid ${vars.border}`,
      borderRadius: 18,
      padding: 16,
      boxShadow: vars.shadow,
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      border: `1px solid ${vars.border}`,
      background: vars.card2,
      fontSize: 12,
      color: vars.mut,
    },
    hr: { height: 1, background: vars.border, border: 0, margin: "14px 0" },
    err: { color: vars.bad, fontSize: 13, margin: "10px 0 0" },
  };

  const selectOptionStyle: React.CSSProperties = {
    backgroundColor: theme === "dark" ? "#0f1a2e" : "#ffffff",
    color: theme === "dark" ? "#eaf0ff" : "#0f172a",
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div style={styles.titleWrap}>
            <h1 style={styles.h1}>Dashboard</h1>
            <p style={styles.sub}>
              Decision-first demo • token:{" "}
              <span style={{ color: getToken() ? vars.good : vars.bad, fontWeight: 800 }}>
                {getToken() ? "✅ stored" : "❌ none"}
              </span>
            </p>
          </div>

          <div style={styles.pills}>
            <span style={styles.badge}>
              Theme: <b style={{ color: vars.text }}>{theme}</b>
            </span>

            <button
              style={styles.btn}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              type="button"
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>

            <button style={styles.btn} onClick={loadMe} type="button" disabled={busy}>
              {busy ? "Loading..." : "Refresh /me"}
            </button>

            <button style={styles.btn} onClick={onLogout} type="button">
              Logout
            </button>
          </div>
        </div>

        {error && <div style={styles.err}>{error}</div>}

        <div style={styles.grid}>
          {/* LEFT: Session */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Session</h3>
            <p style={styles.cardSub}>Αυτό δείχνει ποιος είσαι + σε ποιο tenant ανήκεις.</p>

            <div style={styles.kv}>
              <div style={styles.label}>email</div>
              <div style={styles.value}>{me?.email ?? "—"}</div>

              <div style={styles.label}>tenant_id</div>
              <div style={styles.value}>{me?.tenant_id ?? "—"}</div>

              <div style={styles.label}>org_type</div>
              <div style={styles.value}>{me?.org_type ?? "—"}</div>
            </div>

            <hr style={styles.hr} />

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, color: vars.mut }}>Raw /auth/me</div>
              <pre style={styles.mono}>{me ? JSON.stringify(me, null, 2) : "{ }"}</pre>
            </div>
          </div>

          {/* RIGHT: Ask Decision */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Ask Decision</h3>
            <p style={styles.cardSub}>
              Διάλεξε preset ή γράψε ελεύθερο κείμενο. Τα fields είναι strict JSON object.
            </p>

            <form onSubmit={onAsk} style={styles.form}>
              <div style={styles.field}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <label style={{ fontSize: 12, color: vars.mut }}>Preset</label>
                  <button style={styles.btn} type="button" onClick={() => applyPreset(presetId)}>
                    Reset preset
                  </button>
                </div>

                <select
                  value={presetId}
                  onChange={(e) => applyPreset(e.target.value)}
                  style={{
                    ...styles.input,
                    appearance: "none",
                    minHeight: 46,
                    fontWeight: 700,
                  }}
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id} style={selectOptionStyle}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <p style={styles.hint}>Tip: αλλάζεις preset → γεμίζει αυτόματα question + fields.</p>
              </div>

              <div style={styles.field}>
                <label style={{ fontSize: 12, color: vars.mut }}>Question (free text)</label>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  style={{ ...styles.input, minHeight: 46 }}
                  placeholder="π.χ. Θέλω ενημέρωση απουσιών"
                />
              </div>

              <div style={styles.field}>
                <label style={{ fontSize: 12, color: vars.mut }}>Fields (structured JSON object)</label>
                <textarea
                  value={fieldsJson}
                  onChange={(e) => setFieldsJson(e.target.value)}
                  style={styles.textarea}
                  spellCheck={false}
                />
                <p style={styles.hint}>
                  Παράδειγμα: {"{"} "student_id": "STU-002" {"}"}
                </p>
              </div>

              <div style={styles.row}>
                <button style={styles.btnPrimary} type="submit" disabled={busy}>
                  {busy ? "Asking..." : "Ask"}
                </button>
                <span style={{ fontSize: 12, color: vars.mut }}>
                  Request payload preview ↓ (για debugging)
                </span>
              </div>

              <pre style={styles.mono}>{payloadPreview}</pre>
            </form>
          </div>
        </div>

        {/* RESULT */}
        <div style={styles.footerCard}>
          <h3 style={styles.cardTitle}>Decision Result</h3>
          <p style={styles.cardSub}>Πάτα Ask για να πάρεις δομημένη απόφαση + actions results.</p>

          <hr style={styles.hr} />

          {decision ? (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={styles.badge}>
                  decision: <b style={{ color: vars.text }}>{decision.decision}</b>
                </span>
                <span style={styles.badge}>
                  confidence:{" "}
                  <b style={{ color: decision.confidence >= 0.8 ? vars.good : vars.bad }}>
                    {decision.confidence}
                  </b>
                </span>
                <span style={styles.badge}>
                  rule_id: <b style={{ color: vars.text }}>{decision.rule_id ?? "—"}</b>
                </span>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: vars.mut, marginBottom: 6 }}>Answer</div>
                  <pre style={styles.mono}>{decision.answer || ""}</pre>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: vars.mut, marginBottom: 6 }}>Raw response</div>
                  <pre style={styles.mono}>{JSON.stringify(decision, null, 2)}</pre>
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: vars.mut }}>Δεν υπάρχει αποτέλεσμα ακόμα.</div>
          )}
        </div>
      </div>
    </div>
  );
}
