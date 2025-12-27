const API_BASE = import.meta.env.VITE_API_BASE;

export function setToken(token: string) {
  localStorage.setItem("token", token);
}
export function getToken() {
  return localStorage.getItem("token") || "";
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as any),
  };

  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// --- endpoints ---
export async function login(email: string, password: string) {
  // OAuth2PasswordRequestForm θέλει x-www-form-urlencoded
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Login failed");
  setToken(data.access_token);
  return data;
}

export async function me() {
  return request("/auth/me");
}

export async function decide(tenantId: string, question: string, fields?: any) {
  return request(`/tenants/${tenantId}/decision`, {
    method: "POST",
    body: JSON.stringify({ question, fields: fields || {} }),
  });
}
