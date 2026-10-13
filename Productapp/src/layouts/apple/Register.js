import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import { useAuth } from "context/AuthContext";
import { useMaterialUIController, setLayout } from "context";
import { BRAND, inputAuthSx, primaryBtnSx } from "config/brand";
import AuthBackground from "layouts/apple/components/AuthBackground";
import OtpInput from "layouts/apple/components/OtpInput";
import { emailValidationMessage } from "utils/emailValidation";
import appLogo from "assets/images/app-logo.png";

const OTP_LENGTH = 6;

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [, dispatch] = useMaterialUIController();

  // Auth screens use the page layout; the dashboard sidenav must stay hidden.
  useEffect(() => {
    setLayout(dispatch, "page");
    document.title = "Register · Malus Lens";
  }, [dispatch]);

  const [form, setForm] = useState({
    organisation: "",
    userName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState("");

  // OTP step state
  const [step, setStep] = useState("form"); // form | otp
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  // Resend countdown, driven by the API's own cooldown value.
  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  /** Map an API failure onto the right place: form banner, field, or popup. */
  const handleFailure = (err, email) => {
    const msg = err.message || "";
    if (err.status === 409 && /email already/i.test(msg)) {
      setDuplicateEmail(email);
      return;
    }
    if (err.status === 409 && /user ?name already taken/i.test(msg)) {
      setError("That user name is already taken. Choose a different one.");
      return;
    }
    setError(msg || "Registration failed");
  };

  const validateForm = () => {
    const email = (form.email || "").trim();
    const emailMsg = emailValidationMessage(email);
    setEmailError(emailMsg);
    if (emailMsg) return null;

    if ((form.password || "").length < 8) {
      setError("Password must be at least 8 characters");
      return null;
    }
    if (!(form.userName || "").trim()) {
      setError("User name is required");
      return null;
    }
    return {
      userName: (form.userName || "").trim(),
      email,
      password: form.password,
      organisation: (form.organisation || "").trim(),
    };
  };

  /** Step 1 submit — validate, then ask the API to email the code. */
  const onSubmit = async (e) => {
    e.preventDefault();
    // The OTP step has its own controls; Enter there verifies the code.
    if (step === "otp") {
      if (code.length === OTP_LENGTH) verifyOtp();
      return;
    }
    setError("");
    setOtpError("");
    setDuplicateEmail("");

    const payload = validateForm();
    if (!payload) return;

    setLoading(true);
    try {
      const challenge = await register(payload);
      setDevCode(challenge?.dev_code || "");
      setResendIn(challenge?.resend_after_seconds || 60);
      setCode("");
      setStep("otp");
    } catch (err) {
      handleFailure(err, payload.email);
    } finally {
      setLoading(false);
    }
  };

  /** Step 2 submit — verify the code, which creates the account. */
  const verifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setOtpError("");
    if (code.length !== OTP_LENGTH) {
      setOtpError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }
    const email = (form.email || "").trim();
    setLoading(true);
    try {
      await register({ ...(validateForm() || { userName: form.userName, email }), code });
      navigate("/authentication/pending", { replace: true, state: { email } });
    } catch (err) {
      const msg = err.message || "Verification failed";
      if (err.status === 409 && /email already/i.test(msg)) {
        setDuplicateEmail(email);
        return;
      }
      setOtpError(msg);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setOtpError("");
    setError("");
    setLoading(true);
    try {
      const challenge = await register(
        validateForm() || {
          userName: form.userName,
          email: form.email,
          password: form.password,
          organisation: form.organisation,
        }
      );
      setDevCode(challenge?.dev_code || "");
      setResendIn(challenge?.resend_after_seconds || 60);
      setCode("");
    } catch (err) {
      handleFailure(err, (form.email || "").trim());
    } finally {
      setLoading(false);
    }
  };

  const backToForm = () => {
    setStep("form");
    setCode("");
    setOtpError("");
    setError("");
  };

  return (
    <AuthBackground>
      <MDBox
        component="form"
        onSubmit={onSubmit}
        noValidate
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
          {step === "form" ? "Register" : "Verify your email"}
        </MDTypography>
        <MDTypography variant="body2" textAlign="center" mb={3.5} sx={{ color: "#555" }}>
          {step === "form"
            ? "Create your Malus Lens account"
            : `We sent a ${OTP_LENGTH}-digit code to ${form.email}`}
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

        {step === "form" && (
          <>
            <MDBox mb={2}>
              <MDInput
                label="Organisation"
                fullWidth
                value={form.organisation}
                onChange={set("organisation")}
                required
                sx={inputAuthSx}
              />
            </MDBox>
            <MDBox mb={2}>
              <MDInput
                label="User Name"
                fullWidth
                value={form.userName}
                onChange={set("userName")}
                required
                sx={inputAuthSx}
              />
            </MDBox>
            <MDBox mb={2}>
              <MDInput
                type="email"
                label="Email"
                name="email"
                autoComplete="email"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }));
                  if (emailError) setEmailError("");
                  setError("");
                }}
                error={Boolean(emailError)}
                helperText={emailError || " "}
                FormHelperTextProps={{ sx: { mx: 0.5, fontSize: "0.75rem" } }}
                required
                sx={inputAuthSx}
              />
            </MDBox>
            <MDBox mb={3}>
              <MDInput
                type="password"
                label="Password"
                name="password"
                autoComplete="new-password"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.password}
                onChange={set("password")}
                required
                sx={inputAuthSx}
              />
            </MDBox>

            <MDButton
              type="submit"
              variant="gradient"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ ...primaryBtnSx, py: 1.6, fontSize: "1rem" }}
            >
              {loading ? "Sending code…" : "Continue"}
            </MDButton>
          </>
        )}

        {step === "otp" && (
          <>
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (otpError) setOtpError("");
              }}
              onKeyDown={(e) => {
                // Enter submits once all digits are in; with only five tries
                // allowed, a typo should never cost an attempt by accident.
                if (e.key === "Enter" && code.length === OTP_LENGTH && !loading) {
                  e.preventDefault();
                  verifyOtp();
                }
              }}
              disabled={loading}
              length={OTP_LENGTH}
              hasError={Boolean(otpError)}
            />

            {otpError && (
              <MDBox
                mb={2}
                p={1.5}
                borderRadius={2}
                sx={{ bgcolor: "#fff5f5", border: `1px solid ${BRAND.accent}` }}
              >
                <MDTypography variant="caption" fontWeight="bold" sx={{ color: BRAND.black }}>
                  {otpError}
                </MDTypography>
              </MDBox>
            )}

            {devCode && (
              <MDBox
                mb={2}
                p={1.5}
                borderRadius={2}
                sx={{ bgcolor: "#fff8e1", border: "1px solid #e0a800" }}
              >
                <MDTypography variant="caption" sx={{ color: BRAND.black }}>
                  SMTP not configured — development code: <strong>{devCode}</strong>
                </MDTypography>
              </MDBox>
            )}

            <MDButton
              type="button"
              variant="gradient"
              fullWidth
              size="large"
              disabled={loading || code.length !== OTP_LENGTH}
              onClick={verifyOtp}
              sx={{ ...primaryBtnSx, py: 1.6, fontSize: "1rem" }}
            >
              {loading ? "Verifying…" : "Verify and create account"}
            </MDButton>

            <MDBox mt={2} display="flex" justifyContent="center" gap={2}>
              <MDTypography
                component="button"
                type="button"
                variant="caption"
                onClick={backToForm}
                sx={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#555",
                  font: "inherit",
                }}
              >
                ← Change details
              </MDTypography>
              <MDTypography
                component="button"
                type="button"
                variant="caption"
                disabled={resendIn > 0 || loading}
                onClick={resendOtp}
                sx={{
                  background: "none",
                  border: "none",
                  cursor: resendIn > 0 ? "default" : "pointer",
                  color: resendIn > 0 ? "#aaa" : BRAND.accent,
                  font: "inherit",
                  fontWeight: "bold",
                }}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </MDTypography>
            </MDBox>
          </>
        )}

        {step === "form" && (
          <MDBox mt={3} textAlign="center">
            <MDTypography variant="button" sx={{ color: "#555" }}>
              Already registered?{" "}
              <MDTypography
                component={Link}
                to="/authentication/sign-in"
                variant="button"
                fontWeight="bold"
                sx={{ color: BRAND.accent, textDecoration: "none" }}
              >
                Sign in
              </MDTypography>
            </MDTypography>
          </MDBox>
        )}

        <MDBox mt={2} textAlign="center">
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

      <Dialog
        open={Boolean(duplicateEmail)}
        onClose={() => setDuplicateEmail("")}
        maxWidth="xs"
        fullWidth
        aria-labelledby="duplicate-email-title"
      >
        <MDBox p={2} display="flex" justifyContent="center">
          <MDBox
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#fff5f5",
              border: `2px solid ${BRAND.accent}`,
            }}
          >
            <Icon sx={{ fontSize: 30, color: BRAND.accent }}>mark_email_unread</Icon>
          </MDBox>
        </MDBox>
        {/* DialogTitle already renders a heading element, so style it directly. */}
        <DialogTitle
          id="duplicate-email-title"
          sx={{ textAlign: "center", pb: 1, color: BRAND.black }}
        >
          <strong style={{ fontSize: "1.5rem", fontWeight: 700 }}>Email already exists</strong>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <MDTypography variant="body2" sx={{ color: "#555" }}>
            An account is already registered with <strong>{duplicateEmail}</strong>. Sign in
            instead, or use a different email address.
          </MDTypography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 1.5, pb: 3 }}>
          <MDButton
            variant="outlined"
            color="dark"
            onClick={() => setDuplicateEmail("")}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            Use another email
          </MDButton>
          <MDButton
            variant="gradient"
            onClick={() => {
              setDuplicateEmail("");
              navigate("/authentication/sign-in", {
                replace: true,
                state: { emailOrMobile: duplicateEmail },
              });
            }}
            sx={{ ...primaryBtnSx, py: 1.1, px: 3 }}
          >
            Sign in
          </MDButton>
        </DialogActions>
      </Dialog>
    </AuthBackground>
  );
}

export default Register;
