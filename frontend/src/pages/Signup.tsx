import { useState } from "react";
import { apiFetch, setToken } from "../api/client";

export default function Signup() {
  const [orgName, setOrgName] = useState("Demo School");
  const [orgType, setOrgType] = useState("school");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("123456");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      const data = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          org_name: orgName,
          org_type: orgType,
          email,
          password,
        }),
      });

      // auto-login token από signup
      const token = data?.token?.access_token;
      if (token) setToken(token);

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Signup failed");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", fontFamily: "sans-serif" }}>
      <h2>Signup (create tenant + admin)</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Org name
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
        </label>

        <label>
          Org type
          <input value={orgType} onChange={(e) => setOrgType(e.target.value)} />
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            π.χ. school, college, clinic, law_firm
          </div>
        </label>

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Password
          <input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit">Create account</button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {result && (
        <>
          <h3>Result</h3>
          <pre style={{ background: "#111", color: "#0f0", padding: 12, overflow: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
          <p>
            Αν αποθηκεύτηκε token, πήγαινε στο <b>Dashboard</b>.
          </p>
        </>
      )}
    </div>
  );
}
