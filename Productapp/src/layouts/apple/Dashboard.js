import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Icon from "@mui/material/Icon";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import AppShell from "layouts/apple/AppShell";
import { useAuth } from "context/AuthContext";
import { useAnalysis } from "context/AnalysisContext";
import { BRAND, cardSx, primaryBtnSx } from "config/brand";
import appLogo from "assets/images/app-logo.png";

function Dashboard() {
  const { user, subscriptionActive, refreshMe } = useAuth();
  const { resetAnalysis } = useAnalysis();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const displayName =
    user?.full_name || user?.email?.split("@")[0] || "User";

  useEffect(() => {
    document.title = "Dashboard · Malus Lens";
    refreshMe().catch(() => {});
  }, [refreshMe]);

  const startAnalysis = async () => {
    setChecking(true);
    try {
      const me = await refreshMe();
      const active = Boolean(me?.subscription_active);
      if (!active) {
        navigate("/subscription-blocked");
        return;
      }
      resetAnalysis();
      navigate("/analysis/lot");
    } catch {
      navigate("/subscription-blocked");
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppShell title="Dashboard">
      <Card sx={{ ...cardSx, p: { xs: 2.5, md: 3 }, mb: 3 }}>
        <MDBox
          component="img"
          src={appLogo}
          alt="Malus Lens logo"
          sx={{
            width: "100%",
            maxWidth: 340,
            height: "auto",
            maxHeight: 80,
            objectFit: "contain",
            objectPosition: "left center",
            display: "block",
            mb: 2,
            bgcolor: BRAND.white,
          }}
        />
        <MDTypography variant="h5" fontWeight="bold" mb={0.75} sx={{ color: BRAND.black }}>
          Welcome to Malus Lens
        </MDTypography>
        <MDTypography variant="body2" sx={{ color: BRAND.black, opacity: 0.85 }}>
          {displayName}
          {user?.organization_name ? ` · ${user.organization_name}` : ""}
        </MDTypography>
        <MDTypography
          variant="caption"
          display="block"
          mt={0.5}
          sx={{ color: BRAND.black, opacity: 0.55 }}
        >
          No report history is stored. Download the PDF on this device after each analysis.
        </MDTypography>
      </Card>

      {!subscriptionActive && (
        <Alert
          severity="info"
          icon={false}
          sx={{
            mb: 2.5,
            bgcolor: "#fff8f8",
            color: BRAND.black,
            border: `1px solid ${BRAND.accent}`,
            borderRadius: 2,
            "& .MuiAlert-message": { color: BRAND.black },
          }}
        >
          Subscription inactive. New analysis is blocked until an admin activates it.
        </Alert>
      )}

      <Card sx={{ ...cardSx, overflow: "hidden" }}>
        <MDBox
          px={3}
          py={2.25}
          display="flex"
          alignItems="center"
          gap={1.5}
          sx={{
            background: "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%)",
            borderBottom: "1px solid #f0e0e0",
          }}
        >
          <MDBox
            display="flex"
            alignItems="center"
            justifyContent="center"
            width={48}
            height={48}
            borderRadius={2.5}
            sx={{
              bgcolor: BRAND.accent,
              boxShadow: "0 4px 12px rgba(198,40,40,0.35)",
            }}
          >
            <Icon sx={{ color: BRAND.white, fontSize: 26 }}>science</Icon>
          </MDBox>
          <MDBox>
            <MDTypography variant="h6" fontWeight="bold" sx={{ color: BRAND.black }}>
              New Analysis
            </MDTypography>
            <MDTypography variant="caption" sx={{ color: BRAND.accentDark }}>
              A Grade · B Grade tray grading
            </MDTypography>
          </MDBox>
        </MDBox>

        <MDBox p={3}>
          <MDTypography variant="body2" mb={2.5} sx={{ color: "#333", lineHeight: 1.7 }}>
            Enter lot details, capture exactly 1 photo per crate, then get A Grade / B Grade counts
            and estimated weights.
          </MDTypography>

          <Grid container spacing={1.5} mb={3}>
            {[
              { icon: "inventory_2", text: "Lot & crate details" },
              { icon: "photo_camera", text: "1 image per crate" },
              { icon: "assessment", text: "Instant grade report" },
            ].map((item) => (
              <Grid item xs={12} sm={4} key={item.text}>
                <MDBox
                  display="flex"
                  alignItems="center"
                  gap={1.25}
                  p={1.75}
                  borderRadius={2}
                  sx={{
                    bgcolor: "#fafafa",
                    border: "1px solid #eee",
                  }}
                >
                  <Icon sx={{ color: BRAND.accent, fontSize: 22 }}>{item.icon}</Icon>
                  <MDTypography variant="caption" fontWeight="medium" sx={{ color: "#222" }}>
                    {item.text}
                  </MDTypography>
                </MDBox>
              </Grid>
            ))}
          </Grid>

          <MDButton
            variant="gradient"
            fullWidth
            size="large"
            onClick={startAnalysis}
            disabled={checking}
            sx={primaryBtnSx}
          >
            {checking ? "Checking subscription…" : "Start New Analysis"}
          </MDButton>

          {user?.role === "admin" && (
            <MDButton
              fullWidth
              variant="outlined"
              onClick={() => navigate("/admin")}
              sx={{
                mt: 1.5,
                color: BRAND.black,
                borderColor: "#ddd",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Open Admin panel
            </MDButton>
          )}

          <MDTypography
            component={RouterLink}
            to="/"
            variant="caption"
            display="block"
            textAlign="center"
            mt={2.5}
            sx={{ color: BRAND.black, opacity: 0.5, textDecoration: "none" }}
          >
            ← Back to landing page
          </MDTypography>
        </MDBox>
      </Card>
    </AppShell>
  );
}

export default Dashboard;
