/**
 * In-memory + localStorage admin data for DEMO_MODE only.
 * Lets the Admin UI be exercised without a running API.
 */

const STORAGE_KEY = "apple_demo_admin";

function nowIso() {
  return new Date().toISOString();
}

function defaultState() {
  const created = nowIso();
  return {
    nextUserId: 3,
    nextOrgId: 3,
    organizations: [
      {
        id: 1,
        name: "Demo Organisation",
        subscription_status: "active",
        subscription_expires_at: "2030-12-31T23:59:59+00:00",
        created_at: created,
        updated_at: created,
      },
      {
        id: 2,
        name: "Pending Cold Store",
        subscription_status: "inactive",
        subscription_expires_at: null,
        created_at: created,
        updated_at: created,
      },
    ],
    users: [
      {
        id: 1,
        email: "admin@example.com",
        full_name: "Bootstrap Admin",
        role: "admin",
        status: "approved",
        org_id: null,
        created_at: created,
        updated_at: created,
      },
      {
        id: 2,
        email: "pending.user@example.com",
        full_name: "Awaiting Approval",
        role: "user",
        status: "pending",
        org_id: 2,
        created_at: created,
        updated_at: created,
      },
    ],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const state = defaultState();
  save(state);
  return state;
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const demoAdmin = {
  listPendingUsers() {
    return load().users.filter((u) => u.status === "pending");
  },

  listUsers({ status, org_id } = {}) {
    let users = load().users;
    if (status) users = users.filter((u) => u.status === status);
    if (org_id != null) users = users.filter((u) => u.org_id === Number(org_id));
    return users;
  },

  approveUser(userId, { status, org_id, role }) {
    const state = load();
    const user = state.users.find((u) => u.id === Number(userId));
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    user.status = status;
    if (org_id != null) user.org_id = org_id;
    if (role) user.role = role;
    user.updated_at = nowIso();
    save(state);
    return { message: `User ${userId} set to status '${status}'` };
  },

  updateUser(userId, fields) {
    const state = load();
    const user = state.users.find((u) => u.id === Number(userId));
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    Object.assign(user, fields, { updated_at: nowIso() });
    save(state);
    return { ...user };
  },

  listOrganizations() {
    return load().organizations;
  },

  createOrganization(name) {
    const state = load();
    const org = {
      id: state.nextOrgId++,
      name: String(name).trim(),
      subscription_status: "inactive",
      subscription_expires_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.organizations.push(org);
    save(state);
    return org;
  },

  setOrganizationSubscription(orgId, { status, expires_at }) {
    const state = load();
    const org = state.organizations.find((o) => o.id === Number(orgId));
    if (!org) throw Object.assign(new Error("Organization not found"), { status: 404 });
    org.subscription_status = status;
    org.subscription_expires_at = expires_at || null;
    org.updated_at = nowIso();
    save(state);
    return { ...org };
  },
};

export default demoAdmin;
