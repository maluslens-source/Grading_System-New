import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useMaterialUIController, setLayout } from "context";
import AuthBackground from "layouts/apple/components/AuthBackground";
import { BRAND, primaryBtnSx } from "config/brand";
import appLogo from "assets/images/app-logo.png";

function PendingApproval() {
  const location = useLocation();
  const [, dispatch] = useMaterialUIController();
  const email = location.state?.email || "";

  // Auth screens use the page layout; the dashboard sidenav must stay hidden.
  useEffect(() => {
    setLayout(dispatch, "page");
    document.title = "Waiting for approval · Malus Lens";
  }, [dispatch]);

  return (
    <AuthBackground>
      <MDBox
        position="relative"
        zIndex={1}
        width="100%"
        maxWidth={420}
        px={{ xs: 3, sm: 4 }}
        py={{ xs: 3.5, sm: 4.5 }}
        borderRadius={3}
        textAlign="center"
        sx={{
          bgcolor: "#fff",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
        }}
      >
        <MDBox
          component="img"
          src={appLogo}
          alt="Malus Lens"
          mb={2.5}
          mx="auto"
          sx={{
            width: "100%",
            maxWidth: 480.48,
            height: "auto",
            maxHeight: 113.57,
            objectFit: "contain",
            display: "block",
            bgcolor: BRAND.white,
            borderRadius: 1,
            p: 0.5,
          }}
        />

        <MDBox
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            bgcolor: "#fff5f5",
            border: `2px solid ${BRAND.accent}`,
          }}
        >
          <Icon sx={{ fontSize: 32, color: BRAND.accent }}>hourglass_top</Icon>
        </MDBox>

        <MDTypography
          variant="h4"
          fontWeight="bold"
          mb={1}
          sx={{ color: BRAND.accent, letterSpacing: -0.5 }}
        >
          Waiting for approval
        </MDTypography>
        <MDTypography variant="body2" mb={1} sx={{ color: "#555" }}>
          {email ? (
            <>
              Your registration for <strong>{email}</strong> was submitted.
            </>
          ) : (
            <>Your registration was submitted.</>
          )}
        </MDTypography>
        <MDTypography variant="body2" mb={3} sx={{ color: "#555" }}>
          An admin must approve your account before you can sign in and run analysis.
        </MDTypography>

        <MDButton
          component={Link}
          to="/authentication/sign-in"
          variant="gradient"
          fullWidth
          size="large"
          sx={{ ...primaryBtnSx, py: 1.6, fontSize: "1rem" }}
        >
          Back to Sign in
        </MDButton>

        <MDTypography
          component={Link}
          to="/"
          variant="caption"
          display="block"
          mt={2}
          fontWeight="medium"
          sx={{ color: "#777", textDecoration: "none" }}
        >
          ← Back to Malus Lens home
        </MDTypography>
      </MDBox>
    </AuthBackground>
  );
}

export default PendingApproval;
