import { useState } from "react";
import { apiFetch, setToken } from "../api/client";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/ruleguide-logo.png"; // άλλαξε αν είναι .png

export default function Signup() {
  const nav = useNavigate();

  const [orgName, setOrgName] = useState("Demo School");
  const [orgType, setOrgType] = useState("school");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("123456");
  const [remember, setRemember] = useState(true);

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          org_name: orgName.trim(),
          org_type: orgType.trim(),
          email: email.trim(),
          password,
        }),
      });

      // auto-login token από signup
      const token = data?.token?.access_token;
      if (token) setToken(token, remember);

      setResult(data);

      // πήγαινε dashboard άμεσα (πιο smooth)
      nav("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Signup failed");
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

          <h1 className="auth-title">Create Tenant</h1>
          <p className="auth-subtitle">Create an organization + admin account</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={onSubmit} className="auth-form">
            <label className="auth-label">
              <span>Organization name</span>
              <input
                className="auth-input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Demo School"
                required
              />
            </label>

            <label className="auth-label">
              <span>Organization type</span>
              <select
                className="auth-select"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
              >
                <option value="school">school</option>
                <option value="college">college</option>
                <option value="clinic">clinic</option>
                <option value="law_firm">law_firm</option>
                <option value="restaurant">restaurant</option>
              </select>
              <div className="auth-help">
                Tip: αυτό επιλέγει ποιο ruleset φορτώνεται (π.χ. <b>school_v1.json</b>).
              </div>
            </label>

            <label className="auth-label">
              <span>Admin email</span>
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
              <span>Admin password</span>
              <input
                className="auth-input"
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
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

              <Link className="auth-link" to="/login">
                Already have an account?
              </Link>
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </button>

            {result && (
              <div className="auth-success">
                ✅ Tenant created. Redirected to dashboard.
              </div>
            )}

            <div className="auth-footer">
              <span>Want to login instead?</span> <Link to="/login">Login</Link>
            </div>
          </form>
        </div>

        <div className="auth-hint">
          MVP flow: Signup → auto-token → Dashboard.
        </div>
      </div>
    </div>
  );
}
