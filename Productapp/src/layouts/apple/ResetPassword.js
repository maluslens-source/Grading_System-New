import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import { useMaterialUIController, setLayout } from "context";
import { DEMO_MODE } from "config/demoMode";
import api from "services/api";
import { BRAND, inputBlackSx, primaryBtnSx } from "config/brand";
import loginBg from "assets/images/login-bg.png";
import appLogo from "assets/images/app-logo.png";

function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [, dispatch] = useMaterialUIController();
  const tokenFromUrl = useMemo(() => params.get("token") || "", [params]);
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLayout(dispatch, "page");
  }, [dispatch]);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token.trim()) {
      setError("Reset token is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (DEMO_MODE) {
      setError("Password reset is not available. Contact your admin.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.resetPassword({
        token: token.trim(),
        new_password: password,
      });
      setMessage(data.message || "Password updated. Please log in.");
      setTimeout(() => navigate("/authentication/sign-in"), 1200);
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MDBox
      minHeight="100vh"
      width="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      py={4}
      sx={{
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <MDBox
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        sx={{ background: "rgba(0,0,0,0.28)" }}
      />

      <MDBox
        component="form"
        onSubmit={onSubmit}
        position="relative"
        zIndex={1}
        width="100%"
        maxWidth={420}
        px={{ xs: 3, sm: 4 }}
        py={{ xs: 3.5, sm: 4.5 }}
        borderRadius={3}
        sx={{
          bgcolor: "#fff",
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
            maxHeight: 113.57,
            objectFit: "contain",
            display: "block",
          }}
        />

        <MDTypography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          mb={0.5}
          sx={{ color: BRAND.accent }}
        >
          Set new password
        </MDTypography>
        <MDTypography variant="body2" textAlign="center" mb={3} sx={{ color: "#555" }}>
          Paste your reset token and choose a new password.
        </MDTypography>

        {error && (
          <MDBox
            mb={2}
            p={1.5}
            borderRadius={2}
            sx={{ bgcolor: "#fff5f5", border: `1px solid ${BRAND.accent}` }}
          >
            <MDTypography variant="caption" fontWeight="bold" sx={{ color: BRAND.black }}>
              {error}
            </MDTypography>
          </MDBox>
        )}

        {message && (
          <MDBox
            mb={2}
            p={1.5}
            borderRadius={2}
            sx={{ bgcolor: "#f3faf3", border: "1px solid #a5d6a7" }}
          >
            <MDTypography variant="caption" fontWeight="medium" sx={{ color: BRAND.black }}>
              {message}
            </MDTypography>
          </MDBox>
        )}

        <MDBox mb={2}>
          <MDInput
            type="text"
            label="Reset token"
            fullWidth
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            sx={inputBlackSx}
          />
        </MDBox>
        <MDBox mb={2}>
          <MDInput
            type="password"
            label="New password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={inputBlackSx}
          />
        </MDBox>
        <MDBox mb={3}>
          <MDInput
            type="password"
            label="Confirm password"
            fullWidth
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            sx={inputBlackSx}
          />
        </MDBox>

        <MDButton
          type="submit"
          fullWidth
          size="large"
          disabled={loading}
          sx={{ ...primaryBtnSx, py: 1.5 }}
        >
          {loading ? "Updating…" : "Update password"}
        </MDButton>

        <MDBox mt={3} textAlign="center">
          <MDTypography
            component={Link}
            to="/authentication/forgot-password"
            variant="button"
            fontWeight="medium"
            sx={{ color: "#555", textDecoration: "none", display: "block", mb: 1 }}
          >
            Request a new token
          </MDTypography>
          <MDTypography
            component={Link}
            to="/authentication/sign-in"
            variant="button"
            fontWeight="bold"
            sx={{ color: BRAND.accent, textDecoration: "none" }}
          >
            Back to Login
          </MDTypography>
        </MDBox>
      </MDBox>
    </MDBox>
  );
}

export default ResetPassword;
