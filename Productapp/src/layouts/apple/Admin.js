import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import AppShell from "layouts/apple/AppShell";
import api from "services/api";
import demoAdmin from "services/demoAdminStore";
import { DEMO_MODE } from "config/demoMode";
import { BRAND, cardSx, primaryBtnSx, inputBlackSx } from "config/brand";

function statusColor(status) {
  if (status === "approved" || status === "active") return "success";
  if (status === "pending" || status === "inactive") return "warning";
  return "error";
}

function orgName(orgs, orgId) {
  if (orgId == null) return "—";
  const org = orgs.find((o) => o.id === orgId);
  return org ? org.name : `#${orgId}`;
}

function Admin() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [approveOrgByUser, setApproveOrgByUser] = useState({});
  const [subStatusByOrg, setSubStatusByOrg] = useState({});
  const [subExpiryByOrg, setSubExpiryByOrg] = useState({});

  const client = useMemo(
    () =>
      DEMO_MODE
        ? demoAdmin
        : {
            listPendingUsers: () => api.listPendingUsers(),
            listUsers: (opts) => api.listUsers(opts),
            approveUser: (id, body) => api.approveUser(id, body),
            updateUser: (id, fields) => api.updateUser(id, fields),
            listOrganizations: () => api.listOrganizations(),
            createOrganization: (name) => api.createOrganization(name),
            setOrganizationSubscription: (id, body) => api.setOrganizationSubscription(id, body),
          },
    []
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, u, o] = await Promise.all([
        client.listPendingUsers(),
        client.listUsers(),
        client.listOrganizations(),
      ]);
      setPending(p || []);
      setUsers(u || []);
      setOrgs(o || []);
      const statusMap = {};
      const expiryMap = {};
      (o || []).forEach((org) => {
        statusMap[org.id] = org.subscription_status || "inactive";
        expiryMap[org.id] = org.subscription_expires_at
          ? String(org.subscription_expires_at).slice(0, 10)
          : "";
      });
      setSubStatusByOrg(statusMap);
      setSubExpiryByOrg(expiryMap);
    } catch (err) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runAction = async (key, fn, successMsg) => {
    setBusyId(key);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(successMsg);
      await refresh();
    } catch (err) {
      setError(err.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const onApprove = (user, status) => {
    const orgId = approveOrgByUser[user.id] ?? user.org_id ?? null;
    return runAction(
      `user-${user.id}-${status}`,
      () =>
        client.approveUser(user.id, {
          status,
          org_id: orgId != null && orgId !== "" ? Number(orgId) : null,
          role: "user",
        }),
      status === "approved" ? `Approved ${user.email}` : `Rejected ${user.email}`
    );
  };

  const onCreateOrg = () => {
    const name = newOrgName.trim();
    if (!name) {
      setError("Organisation name is required");
      return;
    }
    return runAction("create-org", () => client.createOrganization(name), `Created “${name}”`).then(
      () => setNewOrgName("")
    );
  };

  const onSaveSubscription = (org) => {
    const status = subStatusByOrg[org.id] || "inactive";
    const date = (subExpiryByOrg[org.id] || "").trim();
    return runAction(
      `sub-${org.id}`,
      () =>
        client.setOrganizationSubscription(org.id, {
          status,
          expires_at: date ? `${date}T23:59:59+00:00` : null,
        }),
      `Updated subscription for ${org.name}`
    );
  };

  return (
    <AppShell title="Admin" contentMaxWidth={1100}>
      <Card sx={{ ...cardSx, p: { xs: 2, md: 2.5 }, mb: 2.5 }}>
        <MDTypography variant="h5" fontWeight="bold" sx={{ color: BRAND.black }}>
          Admin panel
        </MDTypography>
        <MDTypography variant="body2" mt={0.5} sx={{ color: BRAND.black, opacity: 0.75 }}>
          Approve registrations, manage organisations, and activate subscriptions.
        </MDTypography>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      <Card sx={{ ...cardSx, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            px: 1,
            borderBottom: "1px solid #eee",
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, color: BRAND.black },
            "& .Mui-selected": { color: `${BRAND.accentDark} !important` },
            "& .MuiTabs-indicator": { bgcolor: BRAND.accent },
          }}
        >
          <Tab label={`Pending (${pending.length})`} />
          <Tab label={`Users (${users.length})`} />
          <Tab label={`Organisations (${orgs.length})`} />
        </Tabs>

        <MDBox p={{ xs: 2, md: 2.5 }}>
          {loading ? (
            <MDBox display="flex" justifyContent="center" py={6}>
              <CircularProgress size={36} sx={{ color: BRAND.accent }} />
            </MDBox>
          ) : (
            <>
              {tab === 0 && (
                <MDBox>
                  {pending.length === 0 ? (
                    <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.65 }}>
                      No pending registrations.
                    </MDTypography>
                  ) : (
                    pending.map((user) => (
                      <MDBox
                        key={user.id}
                        mb={2}
                        p={2}
                        borderRadius={2}
                        sx={{ border: "1px solid #eee", bgcolor: BRAND.grey }}
                      >
                        <MDBox
                          display="flex"
                          flexWrap="wrap"
                          alignItems="center"
                          justifyContent="space-between"
                          gap={1}
                          mb={1.5}
                        >
                          <MDBox>
                            <MDTypography
                              variant="button"
                              fontWeight="bold"
                              sx={{ color: BRAND.black }}
                            >
                              {user.full_name || "—"}
                            </MDTypography>
                            <MDTypography
                              variant="caption"
                              display="block"
                              sx={{ color: BRAND.black, opacity: 0.65 }}
                            >
                              {user.email}
                            </MDTypography>
                          </MDBox>
                          <Chip size="small" label={user.status} color={statusColor(user.status)} />
                        </MDBox>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Assign organisation"
                          value={approveOrgByUser[user.id] ?? user.org_id ?? ""}
                          onChange={(e) =>
                            setApproveOrgByUser((prev) => ({
                              ...prev,
                              [user.id]: e.target.value === "" ? "" : Number(e.target.value),
                            }))
                          }
                          sx={{ ...inputBlackSx, mb: 1.5, maxWidth: 420 }}
                        >
                          <MenuItem value="">No organisation</MenuItem>
                          {orgs.map((org) => (
                            <MenuItem key={org.id} value={org.id}>
                              {org.name}
                            </MenuItem>
                          ))}
                        </TextField>
                        <MDBox display="flex" flexWrap="wrap" gap={1}>
                          <MDButton
                            sx={{ ...primaryBtnSx, minWidth: 120 }}
                            disabled={busyId === `user-${user.id}-approved`}
                            onClick={() => onApprove(user, "approved")}
                          >
                            Approve
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            sx={{
                              color: BRAND.black,
                              borderColor: "#ccc",
                              textTransform: "none",
                              fontWeight: 600,
                            }}
                            disabled={busyId === `user-${user.id}-rejected`}
                            onClick={() => onApprove(user, "rejected")}
                          >
                            Reject
                          </MDButton>
                        </MDBox>
                      </MDBox>
                    ))
                  )}
                </MDBox>
              )}

              {tab === 1 && (
                <MDBox sx={{ overflowX: "auto" }}>
                  {users.length === 0 ? (
                    <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.65 }}>
                      No users yet.
                    </MDTypography>
                  ) : (
                    users.map((user) => (
                      <MDBox
                        key={user.id}
                        display="flex"
                        flexWrap="wrap"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={1}
                        py={1.5}
                        sx={{ borderBottom: "1px solid #eee" }}
                      >
                        <MDBox minWidth={200}>
                          <MDTypography
                            variant="button"
                            fontWeight="bold"
                            sx={{ color: BRAND.black }}
                          >
                            {user.full_name || "—"}
                          </MDTypography>
                          <MDTypography
                            variant="caption"
                            display="block"
                            sx={{ color: BRAND.black, opacity: 0.65 }}
                          >
                            {user.email} · {orgName(orgs, user.org_id)}
                          </MDTypography>
                        </MDBox>
                        <MDBox display="flex" gap={1} flexWrap="wrap">
                          <Chip size="small" label={user.role} variant="outlined" />
                          <Chip size="small" label={user.status} color={statusColor(user.status)} />
                        </MDBox>
                      </MDBox>
                    ))
                  )}
                </MDBox>
              )}

              {tab === 2 && (
                <MDBox>
                  <MDBox display="flex" flexWrap="wrap" gap={1.5} alignItems="flex-start" mb={2.5}>
                    <TextField
                      size="small"
                      label="New organisation name"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      sx={{ ...inputBlackSx, flex: "1 1 220px", maxWidth: 420 }}
                    />
                    <MDButton
                      sx={{ ...primaryBtnSx, minWidth: 140 }}
                      disabled={busyId === "create-org"}
                      onClick={onCreateOrg}
                      startIcon={<Icon>add</Icon>}
                    >
                      Create
                    </MDButton>
                    <MDButton
                      variant="outlined"
                      onClick={refresh}
                      sx={{ color: BRAND.black, borderColor: "#ccc", textTransform: "none" }}
                    >
                      Refresh
                    </MDButton>
                  </MDBox>

                  <Divider sx={{ mb: 2 }} />

                  {orgs.length === 0 ? (
                    <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.65 }}>
                      No organisations yet.
                    </MDTypography>
                  ) : (
                    orgs.map((org) => (
                      <MDBox
                        key={org.id}
                        mb={2}
                        p={2}
                        borderRadius={2}
                        sx={{ border: "1px solid #eee", bgcolor: BRAND.grey }}
                      >
                        <MDBox
                          display="flex"
                          flexWrap="wrap"
                          alignItems="center"
                          justifyContent="space-between"
                          gap={1}
                          mb={1.5}
                        >
                          <MDBox>
                            <MDTypography
                              variant="button"
                              fontWeight="bold"
                              sx={{ color: BRAND.black }}
                            >
                              {org.name}
                            </MDTypography>
                            <MDTypography
                              variant="caption"
                              display="block"
                              sx={{ color: BRAND.black, opacity: 0.65 }}
                            >
                              ID {org.id}
                              {org.subscription_expires_at
                                ? ` · expires ${String(org.subscription_expires_at).slice(0, 10)}`
                                : ""}
                            </MDTypography>
                          </MDBox>
                          <Chip
                            size="small"
                            label={org.subscription_status}
                            color={statusColor(org.subscription_status)}
                          />
                        </MDBox>
                        <MDBox display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
                          <TextField
                            select
                            size="small"
                            label="Subscription"
                            value={subStatusByOrg[org.id] || "inactive"}
                            onChange={(e) =>
                              setSubStatusByOrg((prev) => ({ ...prev, [org.id]: e.target.value }))
                            }
                            sx={{ ...inputBlackSx, minWidth: 160 }}
                          >
                            <MenuItem value="active">active</MenuItem>
                            <MenuItem value="inactive">inactive</MenuItem>
                            <MenuItem value="expired">expired</MenuItem>
                          </TextField>
                          <TextField
                            size="small"
                            type="date"
                            label="Expires"
                            InputLabelProps={{ shrink: true }}
                            value={subExpiryByOrg[org.id] || ""}
                            onChange={(e) =>
                              setSubExpiryByOrg((prev) => ({ ...prev, [org.id]: e.target.value }))
                            }
                            sx={{ ...inputBlackSx, minWidth: 170 }}
                          />
                          <MDButton
                            sx={{ ...primaryBtnSx, minWidth: 120 }}
                            disabled={busyId === `sub-${org.id}`}
                            onClick={() => onSaveSubscription(org)}
                          >
                            Save
                          </MDButton>
                        </MDBox>
                      </MDBox>
                    ))
                  )}
                </MDBox>
              )}
            </>
          )}
        </MDBox>
      </Card>
    </AppShell>
  );
}

export default Admin;
