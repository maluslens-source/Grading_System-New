import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import api from "services/api";
import { DEMO_MODE } from "config/demoMode";
import { getDeviceId } from "utils/deviceId";
import { toLoginEmail } from "utils/weights";
import { emailValidationMessage } from "utils/emailValidation";

const STORAGE_KEY = "apple_auth";
const AuthContext = createContext(null);

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mockUser(emailOrMobile, overrides = {}) {
  const email = toLoginEmail(emailOrMobile) || "demo@product.app";
  const isAdmin =
    overrides.role === "admin" ||
    /^admin@/i.test(email) ||
    email.toLowerCase() === "admin@example.com";
  return {
    id: isAdmin ? 1 : 2,
    email,
    full_name:
      overrides.full_name || (isAdmin ? "Bootstrap Admin" : email.split("@")[0] || "Demo User"),
    role: isAdmin ? "admin" : "user",
    status: "approved",
    org_id: isAdmin ? null : 1,
    organization_name: overrides.organization_name || (isAdmin ? null : "Demo Organisation"),
    subscription_active: true,
    subscription_status: "active",
    subscription_expires_at: "2030-12-31T23:59:59+00:00",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
    ...(isAdmin ? { role: "admin", subscription_active: true } : {}),
  };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadAuth());
  const [user, setUser] = useState(() => loadAuth()?.user || null);
  const [booting, setBooting] = useState(true);

  const persist = useCallback((next) => {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
    setAuth(next);
    setUser(next?.user || null);
  }, []);

  const refreshMe = useCallback(async () => {
    const stored = loadAuth();
    if (!stored?.access_token || !stored?.device_id) {
      persist(null);
      return null;
    }
    if (DEMO_MODE) {
      const me = stored.user || mockUser("demo@product.app");
      const next = { ...stored, user: { ...me, subscription_active: true } };
      persist(next);
      return next.user;
    }
    try {
      const me = await api.me(stored.access_token, stored.device_id);
      const next = { ...stored, user: me };
      persist(next);
      return me;
    } catch (err) {
      if (err.status === 401 || err.status === 403) persist(null);
      throw err;
    }
  }, [persist]);

  useEffect(() => {
    (async () => {
      try {
        const stored = loadAuth();
        if (stored?.expires_at && Date.parse(stored.expires_at) < Date.now()) {
          persist(null);
          return;
        }
        if (DEMO_MODE) {
          if (stored?.access_token) await refreshMe();
        } else if (stored?.access_token) {
          await refreshMe();
        }
      } catch {
        /* session cleared */
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshMe, persist]);

  const login = useCallback(
    async (emailOrMobile, password) => {
      if (!String(emailOrMobile || "").trim()) {
        throw new Error("Email / Mobile required");
      }
      if (String(password || "").length < 4) {
        throw new Error("Password must be at least 4 characters");
      }

      if (DEMO_MODE) {
        const device_id = getDeviceId();
        const userData = mockUser(emailOrMobile);
        const next = {
          access_token: `demo-token-${Date.now()}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          device_id,
          user: userData,
          demo: true,
        };
        persist(next);
        return userData;
      }

      const device_id = getDeviceId();
      const data = await api.login({
        email: toLoginEmail(emailOrMobile),
        password,
        device_id,
      });
      const next = {
        access_token: data.access_token,
        expires_at: data.expires_at,
        device_id: data.device_id,
        user: data.user,
      };
      persist(next);
      return data.user;
    },
    [persist]
  );

  // Registration takes a real email address. Unlike login, a phone number has no
  // valid form here, so the value is passed through untouched.
  const register = useCallback(
    async ({ organisation, userName, email, password, code, skipOtp = false }) => {
      const name = String(userName || "").trim();
      if (!name) {
        throw new Error("User name is required");
      }
      const mail = String(email || "")
        .trim()
        .toLowerCase();
      const mailProblem = emailValidationMessage(mail);
      if (mailProblem) {
        throw new Error(mailProblem);
      }
      const payload = {
        email: mail,
        password,
        full_name: name,
        org_name: String(organisation || "").trim(),
      };

      if (DEMO_MODE || skipOtp) {
        if (String(password || "").length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        return api.register(payload);
      }

      // Step 2 — confirm the code. This must come first: requesting a second
      // code would trip the resend cooldown and replace the code being checked.
      if (code !== undefined && code !== null) {
        return api.verifyRegisterOtp({ email: mail, code: String(code).trim() });
      }
      // Step 1 — ask the API to email a code.
      return api.requestRegisterOtp(payload);
    },
    []
  );

  const logout = useCallback(async () => {
    const stored = loadAuth();
    if (!DEMO_MODE) {
      try {
        if (stored?.access_token) await api.logout(stored.access_token, stored.device_id);
      } catch {
        /* ignore */
      }
    }
    persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({
      booting,
      demoMode: DEMO_MODE,
      user,
      token: auth?.access_token || null,
      deviceId: auth?.device_id || getDeviceId(),
      isAuthenticated: Boolean(auth?.access_token && user),
      subscriptionActive: Boolean(user?.subscription_active),
      login,
      register,
      logout,
      refreshMe,
    }),
    [auth, booting, user, login, register, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
