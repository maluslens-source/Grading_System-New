import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import AppShell from "layouts/apple/AppShell";
import { useAuth } from "context/AuthContext";
import { BRAND } from "config/brand";

function SubscriptionBlocked() {
  const { user, refreshMe, subscriptionActive } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await refreshMe();
        if (me?.subscription_active) navigate("/dashboard", { replace: true });
      } catch {
        /* keep blocked page */
      }
    })();
  }, [refreshMe, navigate]);

  useEffect(() => {
    if (subscriptionActive) navigate("/dashboard", { replace: true });
  }, [subscriptionActive, navigate]);

  const onRefresh = async () => {
    setBusy(true);
    setMsg("");
    try {
      const me = await refreshMe();
      if (me?.subscription_active) {
        navigate("/dashboard", { replace: true });
      } else {
        setMsg(
          `Still inactive (status: ${me?.subscription_status || "unknown"}). Ask admin to activate.`
        );
      }
    } catch (err) {
      setMsg(err.message || "Could not refresh status");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Subscription">
      <Card
        sx={{
          p: 3,
          textAlign: "center",
          bgcolor: BRAND.white,
          border: `1px solid ${BRAND.grey}`,
        }}
      >
        <Icon sx={{ fontSize: 48, mb: 1, color: BRAND.black }}>lock</Icon>
        <MDTypography variant="h5" fontWeight="medium" gutterBottom sx={{ color: BRAND.black }}>
          Analysis blocked
        </MDTypography>
        <MDTypography variant="body2" mb={1} sx={{ color: BRAND.black }}>
          Your organisation subscription is inactive or expired.
        </MDTypography>
        <MDTypography variant="caption" display="block" mb={3} sx={{ color: BRAND.black }}>
          Status: {user?.subscription_status || "unknown"}
          {user?.subscription_expires_at ? ` · Expires: ${user.subscription_expires_at}` : ""}
        </MDTypography>
        <MDTypography variant="body2" mb={3} sx={{ color: BRAND.black }}>
          Login is allowed. After admin activates the subscription, tap Refresh status below.
        </MDTypography>
        {msg && (
          <MDTypography variant="caption" display="block" mb={2} sx={{ color: BRAND.black }}>
            {msg}
          </MDTypography>
        )}
        <MDButton
          variant="gradient"
          color="info"
          fullWidth
          size="large"
          onClick={onRefresh}
          disabled={busy}
          sx={{ mb: 1 }}
        >
          {busy ? "Refreshing…" : "Refresh status"}
        </MDButton>
        <MDButton
          variant="outlined"
          color="info"
          fullWidth
          size="large"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </MDButton>
      </Card>
    </AppShell>
  );
}

export default SubscriptionBlocked;
