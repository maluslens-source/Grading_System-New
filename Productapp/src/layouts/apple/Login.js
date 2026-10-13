import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import { useAuth } from "context/AuthContext";
import { useMaterialUIController, setLayout } from "context";
import { DEMO_MODE } from "config/demoMode";
import { BRAND, inputAuthSx, primaryBtnSx } from "config/brand";
import AuthBackground from "layouts/apple/components/AuthBackground";
import appLogo from "assets/images/app-logo.png";

function Login() {
  const { login, isAuthenticated, booting } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [, dispatch] = useMaterialUIController();
  const registeredHint = Boolean(location.state?.registered);
  const [emailOrMobile, setEmailOrMobile] = useState(
    location.state?.emailOrMobile || (DEMO_MODE ? "admin@example.com" : "")
  );
  const [password, setPassword] = useState(DEMO_MODE && !registeredHint ? "Admin123!" : "");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(location.state?.message || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLayout(dispatch, "page");
    document.title = "Login · Malus Lens";
  }, [dispatch]);

  useEffect(() => {
    if (!booting && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [booting, isAuthenticated, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(emailOrMobile, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      let msg = err.message || "Login failed";
      if (!DEMO_MODE && err.status === 404) {
        msg =
          "API login route not found (404). Server must run uvicorn api.main:app (not http.server).";
      } else if (
        !DEMO_MODE &&
        (err.message === "Failed to fetch" || /NetworkError|ECONNREFUSED/i.test(msg))
      ) {
        msg = "Cannot reach API. Is uvicorn running on this server port?";
      }
      if (/pending/i.test(msg)) navigate("/authentication/pending");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground align={{ xs: "center", md: "flex-end" }}>
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
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
          transform: { md: "translateX(-20px)" },
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

        <MDTypography
          variant="h3"
          fontWeight="bold"
          textAlign="center"
          mb={0.5}
          sx={{ color: BRAND.accent, letterSpacing: -0.5 }}
        >
          Login
        </MDTypography>
        <MDTypography variant="body2" textAlign="center" mb={3.5} sx={{ color: "#555" }}>
          Welcome to Malus Lens
        </MDTypography>

        {info && (
          <MDBox
            mb={2}
            p={1.5}
            borderRadius={2}
            sx={{ bgcolor: "#f0fff4", border: "1px solid #2e7d32" }}
          >
            <MDTypography variant="caption" fontWeight="medium" sx={{ color: BRAND.black }}>
              {info}
            </MDTypography>
          </MDBox>
        )}
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

        <MDBox mb={2.5}>
          <MDInput
            type="text"
            label="Email / Mobile"
            fullWidth
            name="username"
            autoComplete="username"
            InputLabelProps={{ shrink: true }}
            value={emailOrMobile}
            onChange={(e) => setEmailOrMobile(e.target.value)}
            required
            sx={inputAuthSx}
          />
        </MDBox>
        <MDBox mb={3}>
          <MDInput
            type="password"
            label="Password"
            fullWidth
            name="password"
            autoComplete="current-password"
            InputLabelProps={{ shrink: true }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={inputAuthSx}
          />
        </MDBox>

        <MDBox mb={2} textAlign="right">
          <MDTypography
            component={Link}
            to="/authentication/forgot-password"
            variant="caption"
            fontWeight="medium"
            sx={{ color: BRAND.accent, textDecoration: "none" }}
          >
            Forgot password?
          </MDTypography>
        </MDBox>

        <MDButton
          type="submit"
          variant="gradient"
          fullWidth
          size="large"
          disabled={loading}
          sx={{ ...primaryBtnSx, py: 1.6, fontSize: "1rem" }}
        >
          {loading ? "Signing in…" : "Login"}
        </MDButton>

        <MDBox mt={3} textAlign="center">
          <MDTypography variant="button" sx={{ color: "#555" }}>
            Don&apos;t have an account?{" "}
            <MDTypography
              component={Link}
              to="/authentication/sign-up"
              variant="button"
              fontWeight="bold"
              sx={{ color: BRAND.accent, textDecoration: "none" }}
            >
              Register
            </MDTypography>
          </MDTypography>
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
      </MDBox>
    </AuthBackground>
  );
}

export default Login;
