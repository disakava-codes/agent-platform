import { useState } from "react";
import { apiFetch, setToken } from "../api/client";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/ruleguide-logo.png"; // άλλαξε αν είναι .png

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("123456");
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // FastAPI OAuth2PasswordRequestForm θέλει x-www-form-urlencoded
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);

      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        auth: false,
      });

      // res: { access_token, token_type }
      setToken(res.access_token, remember);
      nav("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-logo">
            <img src={logo} alt="RuleGuide AI Assistant" />
          </div>

          <h1 className="auth-title">User Login</h1>
          <p className="auth-subtitle">Sign in to manage your tenant and decisions</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={onSubmit} className="auth-form">
            <label className="auth-label">
              <span>Email</span>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-label">
              <span>Password</span>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            <div className="auth-row">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="auth-linkbtn"
                onClick={() => alert("MVP: θα μπει αργότερα (reset password)")}
              >
                Forgot password?
              </button>
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="auth-footer">
              <span>New here?</span> <Link to="/signup">Create tenant</Link>
            </div>
          </form>
        </div>

        <div className="auth-hint">
          Tip: Στο MVP κάνουμε login με OAuth2 (username=email).
        </div>
      </div>
    </div>
  );
}
