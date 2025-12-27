import { useState } from "react";
import { apiFetch, setToken } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("123456");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      // OAuth2PasswordRequestForm -> x-www-form-urlencoded
      const form = new URLSearchParams();
      form.set("username", email);
      form.set("password", password);

      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      setToken(data.access_token);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", fontFamily: "sans-serif" }}>
      <h2>Login</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
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

        <button type="submit">Login</button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {result && (
        <>
          <h3>Token</h3>
          <pre style={{ background: "#111", color: "#0f0", padding: 12, overflow: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
          <p>Πήγαινε στο <b>Dashboard</b>.</p>
        </>
      )}
    </div>
  );
}
