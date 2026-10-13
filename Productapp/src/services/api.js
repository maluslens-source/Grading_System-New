/**
 * API client for Apple Grading backend (F:\\Ahmad\\api).
 */

/**
 * Resolve API base without hardcoding a LAN IP (IPs change often).
 * - REACT_APP_API_URL set → use it (override)
 * - UI on :3000 → same hostname on :8000 (works for 127.0.0.1 and any 192.168.x.x)
 * - UI on :8000 / production → same origin (empty)
 */
function resolveApiBase() {
  const env = (process.env.REACT_APP_API_URL || "").trim();
  if (env) return env.replace(/\/$/, "");

  if (typeof window === "undefined") return "";

  const { protocol, hostname, port } = window.location;
  if (port === "3000") {
    return `${protocol}//${hostname}:8000`;
  }
  return "";
}

const API_BASE = resolveApiBase();

function getStoredAuth() {
  try {
    const raw = localStorage.getItem("apple_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function parseError(res) {
  let detail = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (typeof data.detail === "string") detail = data.detail;
    else if (Array.isArray(data.detail))
      detail = data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
    else if (data.message) detail = data.message;
  } catch {
    /* ignore */
  }
  const err = new Error(detail);
  err.status = res.status;
  return err;
}

export async function apiRequest(path, { method = "GET", body, token, deviceId, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (deviceId) headers["X-Device-Id"] = deviceId;

  let payload = body;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
  });

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return null;
  return res.json();
}

export function authHeadersFromStorage() {
  const auth = getStoredAuth();
  if (!auth?.access_token || !auth?.device_id) return {};
  return { token: auth.access_token, deviceId: auth.device_id };
}

export const api = {
  baseUrl: API_BASE,

  register({ email, password, full_name, org_name }) {
    return apiRequest("/api/v1/auth/register", {
      method: "POST",
      body: { email, password, full_name, org_name: org_name || null },
    });
  },

  requestRegisterOtp({ email, password, full_name, org_name }) {
    return apiRequest("/api/v1/auth/register/request-otp", {
      method: "POST",
      body: { email, password, full_name, org_name: org_name || null },
    });
  },

  verifyRegisterOtp({ email, code }) {
    return apiRequest("/api/v1/auth/register/verify-otp", {
      method: "POST",
      body: { email, code },
    });
  },

  login({ email, password, device_id }) {
    return apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: { email, password, device_id },
    });
  },

  logout(token, deviceId) {
    return apiRequest("/api/v1/auth/logout", {
      method: "POST",
      token,
      deviceId,
    });
  },

  me(token, deviceId) {
    return apiRequest("/api/v1/auth/me", { token, deviceId });
  },

  forgotPassword({ email }) {
    return apiRequest("/api/v1/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  },

  verifyPasswordOtp({ email, code }) {
    return apiRequest("/api/v1/auth/forgot-password/verify-otp", {
      method: "POST",
      body: { email, code },
    });
  },

  resetPassword({ token, new_password }) {
    return apiRequest("/api/v1/auth/reset-password", {
      method: "POST",
      body: { token, new_password },
    });
  },

  /**
   * Grade 1–10 images via ML API (system a_threshold).
   * @param {File[]} files
   */
  gradeImages(files) {
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f));
    const auth = authHeadersFromStorage();
    return apiRequest("/api/v1/grade", { method: "POST", formData: fd, ...auth });
  },

  // ── Admin (requires role=admin) ───────────────────────────────────
  listPendingUsers() {
    const auth = authHeadersFromStorage();
    return apiRequest("/api/v1/admin/users/pending", auth);
  },

  listUsers({ status, org_id } = {}) {
    const auth = authHeadersFromStorage();
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (org_id != null) q.set("org_id", String(org_id));
    const qs = q.toString();
    return apiRequest(`/api/v1/admin/users${qs ? `?${qs}` : ""}`, auth);
  },

  approveUser(userId, { status, org_id, role }) {
    const auth = authHeadersFromStorage();
    return apiRequest(`/api/v1/admin/users/${userId}/approval`, {
      method: "POST",
      body: { status, org_id: org_id ?? null, role: role ?? null },
      ...auth,
    });
  },

  updateUser(userId, fields) {
    const auth = authHeadersFromStorage();
    return apiRequest(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      body: fields,
      ...auth,
    });
  },

  listOrganizations() {
    const auth = authHeadersFromStorage();
    return apiRequest("/api/v1/admin/organizations", auth);
  },

  createOrganization(name) {
    const auth = authHeadersFromStorage();
    return apiRequest("/api/v1/admin/organizations", {
      method: "POST",
      body: { name },
      ...auth,
    });
  },

  setOrganizationSubscription(orgId, { status, expires_at }) {
    const auth = authHeadersFromStorage();
    return apiRequest(`/api/v1/admin/organizations/${orgId}/subscription`, {
      method: "POST",
      body: { status, expires_at: expires_at || null },
      ...auth,
    });
  },
};

export default api;
